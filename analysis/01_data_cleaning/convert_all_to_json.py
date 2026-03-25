import csv
import json
import os
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

NYC_COUNTIES = {"005", "047", "061", "081", "085"}
HTML_TAG     = re.compile(r'<[^>]+>')


def strip_html(value):
    return HTML_TAG.sub("", value).strip() if isinstance(value, str) else value


def csv_to_json(input_path, output_filename, nyc_only=False):
    rows = []
    with open(input_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if nyc_only and row.get("STATEA") != "36":
                continue
            if nyc_only and row.get("COUNTYA") not in NYC_COUNTIES:
                continue
            clean = {}
            for k, v in row.items():
                v = strip_html(v.strip() if v else "")
                if v == "":
                    clean[k] = None
                else:
                    try:
                        clean[k] = int(v)
                    except ValueError:
                        try:
                            clean[k] = float(v)
                        except ValueError:
                            clean[k] = v
            rows.append(clean)
    out_path = OUT / output_filename
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"))
    size_kb = os.path.getsize(out_path) / 1024
    size_str = f"{size_kb/1024:.1f} MB" if size_kb > 1024 else f"{size_kb:.0f} KB"
    print(f"  ✓ {output_filename}: {len(rows):,} records — {size_str}")


def shp_to_geojson(input_path, output_filename, county_filter=None):
    try:
        import geopandas as gpd
        gdf = gpd.read_file(input_path)
        if county_filter:
            gdf = gdf[gdf["COUNTYFP"].isin(county_filter)].copy()
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        out_path = OUT / output_filename
        gdf.to_file(str(out_path), driver="GeoJSON")
        size_mb = os.path.getsize(out_path) / 1024 / 1024
        print(f"  ✓ {output_filename}: {len(gdf):,} features — {size_mb:.1f} MB")
    except ImportError:
        print(f"  ✗ {output_filename}: geopandas not available")
    except Exception as e:
        print(f"  ✗ {output_filename}: {e}")


def copy_json(input_path, output_filename):
    out_path = OUT / output_filename
    if not out_path.exists():
        with open(input_path) as f:
            data = json.load(f)
        with open(out_path, "w") as f:
            json.dump(data, f, separators=(",", ":"))
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  ✓ {output_filename}: copied — {size_kb:.0f} KB")
    else:
        print(f"  – {output_filename}: already exists, skipped")


def exists(filename):
    return (OUT / filename).exists()


# ACS — NYC tracts only
print("\n--- ACS ---")
if not exists("acs_tract_indicators.json"):
    csv_to_json(RAW / "acs" / "nhgis0001_ds272_20245_tract.csv", "acs_tract_indicators.json", nyc_only=True)
else:
    print("  – acs_tract_indicators.json: already exists, skipped")

if not exists("acs_disability_b18101.json"):
    csv_to_json(RAW / "acs" / "disability_b18101_nyc_tracts.csv", "acs_disability_b18101.json")
else:
    print("  – acs_disability_b18101.json: already exists, skipped")

# HVI
print("\n--- HVI ---")
for src_name, out_name in [
    ("Heat_Vulnerability_Index_Rankings_2024.csv",                                          "hvi_rankings_2024.json"),
    ("hvi_nta_components.csv",                                                              "hvi_nta_components.json"),
    ("hvi_nta_2020.csv",                                                                    "hvi_nta_2020.json"),
    ("Annual number of extreme heat days.csv",                                              "heat_days_annual.json"),
    ("data_201100.csv",                                                                     "heat_health_data.json"),
    ("NYC_Climate_Budgeting_Report__Resiliency_Exposure_Forecast_-_Outdoor_Heat_20260212.csv", "outdoor_heat_forecast_raw.json"),
]:
    if not exists(out_name):
        csv_to_json(RAW / "hvi" / src_name, out_name)
    else:
        print(f"  – {out_name}: already exists, skipped")

copy_json(RAW / "hvi" / "nta_zip_collapsed.json", "nta_zip_crosswalk.json")

# Cool It! NYC
print("\n--- Cool It! NYC ---")
if not exists("cool_it_sites_raw.json"):
    csv_to_json(RAW / "cool_it" / "Cool_It!_NYC_2020_-_Cooling_Sites_20260212.csv", "cool_it_sites_raw.json")
else:
    print("  – cool_it_sites_raw.json: already exists, skipped")

# Cooling Centers
print("\n--- Cooling Centers ---")
if not exists("cooling_centers_raw.json"):
    csv_to_json(RAW / "cooling_centers" / "cooling-locations.csv", "cooling_centers_raw.json")
else:
    print("  – cooling_centers_raw.json: already exists, skipped")

# Shapefiles — NYC only
print("\n--- Shapefiles ---")
if not exists("nyc_zcta_boundaries.geojson"):
    import geopandas as gpd
    gdf = gpd.read_file(str(RAW / "shapefile" / "tl_2020_us_zcta520" / "tl_2020_us_zcta520.shp"))
    nyc_mask = gdf["ZCTA5CE20"].str.match(r'^(100|101|102|103|104|110|111|112|113|114)')
    gdf = gdf[nyc_mask].to_crs(epsg=4326)
    out_path = str(OUT / "nyc_zcta_boundaries.geojson")
    gdf.to_file(out_path, driver="GeoJSON")
    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"  ✓ nyc_zcta_boundaries.geojson: {len(gdf)} features — {size_mb:.1f} MB")
else:
    print("  – nyc_zcta_boundaries.geojson: already exists, skipped")

if not exists("nyc_census_tracts.geojson"):
    shp_to_geojson(
        RAW / "shapefile" / "tl_2024_36_tract" / "tl_2024_36_tract.shp",
        "nyc_census_tracts.geojson",
        county_filter=NYC_COUNTIES
    )
else:
    print("  – nyc_census_tracts.geojson: already exists, skipped")

# Summary
print("\n--- Summary ---")
all_files = sorted(os.listdir(OUT))
total_mb = sum(os.path.getsize(OUT / f) for f in all_files) / 1024 / 1024
print(f"data/processed/: {len(all_files)} files — {total_mb:.0f} MB total")
for f in all_files:
    size = os.path.getsize(OUT / f) / 1024
    print(f"  {f} — {size/1024:.1f} MB" if size > 1024 else f"  {f} — {size:.0f} KB")
