
import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import unary_union

warnings.filterwarnings("ignore")

DATA   = "data/processed"
RAW    = "data/raw"
FINAL  = "data/final"
WEBDATA = "web/data"

print("=" * 60)
print("Pre-Visualization Fixes")
print("=" * 60)


# HVI deduplication

print("\n[1/7] Fixing HVI: dropping 6 duplicate Staten Island NTA rows...")

with open(f"{DATA}/hvi_nta_components.json") as f:
    hvi_raw = pd.DataFrame(json.load(f))

before = len(hvi_raw)
hvi = hvi_raw.drop_duplicates(subset="nta_code", keep="first").copy()
after = len(hvi)
print(f"  {before} → {after} rows (removed {before - after} duplicates)")

# Replace 'unknown' level strings with NaN
for col in ["poverty_level", "greenspace_level", "surface_temp_level", "ac_access_level"]:
    n = (hvi[col] == "unknown").sum()
    hvi[col] = hvi[col].replace("unknown", np.nan)
    print(f"  {col}: {n} 'unknown' replaced with NaN")

with open(f"{FINAL}/hvi_clean.json", "w") as f:
    json.dump(hvi.to_dict(orient="records"), f, default=str)
print(f"  Saved → {FINAL}/hvi_clean.json")


# Heat forecast aggregated to CDTA level

print("\n[2/7] Aggregating heat forecast to CDTA (4-char) level...")

with open(f"{DATA}/outdoor_heat_forecast.json") as f:
    heat_raw = pd.DataFrame(json.load(f))

heat_cdta = heat_raw.groupby("nta_code_4").agg(
    baseline_temp_f=("baseline_temp_f", "mean"),
    projected_temp_f=("projected_temp_f", "mean"),
    planned_action_temp_f=("planned_action_temp_f", "mean"),
    pct_managed_by_action=("pct_managed_by_action", "mean"),
    n_sub_ntas=("nta_code", "count"),
).reset_index().rename(columns={"nta_code_4": "cdta2020"})

print(f"  {len(heat_raw)} NTA rows → {len(heat_cdta)} CDTA rows")

with open(f"{FINAL}/heat_forecast_cdta.json", "w") as f:
    json.dump(heat_cdta.to_dict(orient="records"), f, default=str)
print(f"  Saved → {FINAL}/heat_forecast_cdta.json")


# Build tract base with NTA 2020 direct join (100% coverage)

print("\n[3/7] Joining HVI to tracts via NTA 2020 boundaries (+ NN fallback)...")

with open(f"{DATA}/hvi_nta_2020.json") as f:
    hvi20 = pd.DataFrame(json.load(f))

nta_bounds = gpd.read_file(f"{RAW}/shapefile/nta_2020_boundaries.geojson")

nta_hvi = nta_bounds.merge(
    hvi20[["NTACode", "CDTACode", "HVI_RANK", "SURFACE_TEMP",
           "MEDIAN_INCOME", "PCT_HOUSEHOLDS_AC", "GREENSPACE"]],
    left_on="nta2020", right_on="NTACode", how="left",
)
nta_proj = nta_hvi.to_crs("EPSG:2263")

gdf = gpd.read_file(f"{DATA}/nyc_tract_indicators_v2.geojson")
gdf["borough"] = gdf["COUNTYFP"].map(
    {"005": "Bronx", "047": "Brooklyn", "061": "Manhattan",
     "081": "Queens", "085": "Staten Island"}
)
occ = gdf[gdf["has_occupied_units"]].copy()

tracts_proj = occ.to_crs("EPSG:2263")
cents = tracts_proj.copy()
cents["geometry"] = tracts_proj.geometry.centroid

# Within join
joined = gpd.sjoin(
    cents[["GEOID", "geometry"]],
    nta_proj[["nta2020", "CDTACode", "HVI_RANK", "geometry"]],
    how="left", predicate="within",
).drop_duplicates("GEOID")
joined = joined.rename(columns={"CDTACode": "cdta2020"})

# Nearest-neighbor fallback
unmatched_geoids = joined[joined["HVI_RANK"].isna()]["GEOID"].tolist()
if unmatched_geoids:
    unmatched_cents = cents[cents["GEOID"].isin(unmatched_geoids)].copy()
    nta_with_hvi = nta_proj[nta_proj["HVI_RANK"].notna()].copy()
    nn = gpd.sjoin_nearest(
        unmatched_cents[["GEOID", "geometry"]],
        nta_with_hvi[["nta2020", "CDTACode", "HVI_RANK", "geometry"]],
        how="left",
    ).drop_duplicates("GEOID").rename(columns={"CDTACode": "cdta2020"})
    combined = pd.concat(
        [joined[~joined["GEOID"].isin(unmatched_geoids)][["GEOID", "nta2020", "cdta2020", "HVI_RANK"]],
         nn[["GEOID", "nta2020", "cdta2020", "HVI_RANK"]]],
        ignore_index=True,
    )
else:
    combined = joined[["GEOID", "nta2020", "cdta2020", "HVI_RANK"]]

coverage = combined["HVI_RANK"].notna().sum()
print(f"  HVI coverage: {coverage}/{len(combined)} ({coverage/len(combined)*100:.1f}%)")


# Tract indicators: drop redundant disability columns

print("\n[4/7] Dropping pct_disability_x and pct_disability_y from tract indicators...")

drop_cols = ["pct_disability_x", "pct_disability_y",
             "total_with_disability_x", "total_with_disability_y"]
occ = occ.drop(columns=[c for c in drop_cols if c in occ.columns])
print(f"  Dropped: {[c for c in drop_cols if c in gdf.columns]}")
print(f"  Keeping: pct_disability, total_with_disability")


# Attach heat forecast (CDTA level) to tracts

print("\n[5/7] Attaching heat forecast via cdta2020 key...")

occ = occ.merge(combined[["GEOID", "nta2020", "cdta2020", "HVI_RANK"]], on="GEOID", how="left")
occ = occ.merge(
    heat_cdta.rename(columns={"cdta2020": "cdta2020"}),
    on="cdta2020", how="left",
)
heat_cov = occ["baseline_temp_f"].notna().sum()
print(f"  Baseline temp coverage: {heat_cov}/{len(occ)} ({heat_cov/len(occ)*100:.1f}%)")


# NYCHA: rename typo, resolve cross-borough, attach HVI

print("\n[6/7] Fixing NYCHA data...")

with open(f"{DATA}/nycha_development_data_book.json") as f:
    nycha = pd.DataFrame(json.load(f))

# Rename typo
nycha = nycha.rename(columns={"community_distirct": "community_district"})
print("  Renamed 'community_distirct' → 'community_district'")

# Resolve cross-borough records — assign primary borough (first listed)
cross_borough = nycha["borough"].str.contains("/", na=False)
n_cross = cross_borough.sum()
nycha["borough_primary"] = nycha["borough"].str.split("/").str[0].str.strip()
print(f"  Resolved {n_cross} cross-borough records → primary borough assigned")

# Drop unreliable columns flagged in EDA
nycha = nycha.drop(columns=["electricity_paid_by_residents"], errors="ignore")

# Normalize numeric rent
nycha["avg_monthly_rent_usd"] = pd.to_numeric(nycha["avg_monthly_rent_usd"], errors="coerce")

# Treat missing senior_development as non-senior
nycha["is_senior_development"] = nycha["senior_development"].notna() & \
    (nycha["senior_development"] != "")
print(f"  senior_development: {nycha['is_senior_development'].sum()} senior developments")

# Attach HVI to NYCHA geojson
nycha_geo = gpd.read_file(f"{DATA}/nycha_public_housing_developments.geojson")
zcta_bounds = gpd.read_file(f"{DATA}/nyc_zcta_boundaries.geojson")
hvi_zcta = gpd.read_file(f"{DATA}/hvi_zcta.geojson")

nycha_proj = nycha_geo.to_crs("EPSG:2263")
nycha_proj["geometry"] = nycha_proj.geometry.centroid
zcta_proj = zcta_bounds.to_crs("EPSG:2263")

nycha_zcta = gpd.sjoin(
    nycha_proj[["name", "borough", "geometry"]],
    zcta_proj[["ZCTA5CE20", "geometry"]],
    how="left", predicate="within",
).drop_duplicates("name")

hvi_zcta["zcta_key"] = hvi_zcta["zcta"].astype(str).str.zfill(5)
nycha_zcta["zcta_key"] = nycha_zcta["ZCTA5CE20"].astype(str).str.zfill(5)
nycha_hvi = nycha_zcta.merge(hvi_zcta[["zcta_key", "hvi_score"]], on="zcta_key", how="left")

# Merge NYCHA data book onto geo
nycha_geo_clean = nycha_geo.merge(
    nycha[["development", "borough_primary", "community_district",
           "avg_monthly_rent_usd", "is_senior_development",
           "total_population", "number_of_current_apartments"]],
    left_on="name", right_on="development", how="left",
).merge(
    nycha_hvi[["name", "hvi_score"]].rename(columns={"hvi_score": "hvi_score_zcta"}),
    on="name", how="left",
)

in_high_hvi = (nycha_hvi["hvi_score"] >= 4).sum()
total_hvi = nycha_hvi["hvi_score"].notna().sum()
print(f"  NYCHA in HVI zones 4-5: {in_high_hvi}/{total_hvi} ({in_high_hvi/total_hvi*100:.1f}%)")

nycha_geo_clean.to_file(f"{FINAL}/nycha_clean.geojson", driver="GeoJSON")
print(f"  Saved → {FINAL}/nycha_clean.geojson")


# Cooling desert classification + quantile variables

print("\n[7/7] Adding cooling desert classification and quantile columns...")

# Cooling desert: HVI_RANK >= 4 AND severe rent burden > 30%
occ["is_cooling_desert"] = (
    (occ["HVI_RANK"] >= 4) & (occ["pct_rent_burden_50_plus"] > 30)
).astype(int)

n_cd = occ["is_cooling_desert"].sum()
print(f"  Cooling deserts: {n_cd} tracts ({n_cd/len(occ)*100:.1f}% of NYC)")

# Compound vulnerability flags
lep_q75 = occ["pct_limited_english"].quantile(0.75)
dis_q75 = occ["pct_disability"].quantile(0.75)

occ["is_cooling_desert_lep"] = (
    occ["is_cooling_desert"].astype(bool) &
    (occ["pct_limited_english"] > lep_q75)
).astype(int)

occ["is_cooling_desert_disability"] = (
    occ["is_cooling_desert"].astype(bool) &
    (occ["pct_disability"] > dis_q75)
).astype(int)

# Quantile classifications (5-class) for choropleth
def quantile_class(series, n=5, label="q"):
    """Assign 1-n quantile class; NaN stays NaN."""
    s = series.copy()
    result = pd.Series(np.nan, index=s.index)
    valid = s.notna()
    result[valid] = pd.qcut(s[valid], q=n, labels=False, duplicates="drop") + 1
    return result.astype("Int64")

occ["hvi_rank_q"] = occ["HVI_RANK"]  # already 1-5, keep as is
occ["rent_burden_q"] = quantile_class(occ["pct_rent_burden_50_plus"])
occ["income_q"] = quantile_class(occ["median_household_income"])
occ["lep_q"] = quantile_class(occ["pct_limited_english"])

print(f"  Quantile columns added: rent_burden_q, income_q, lep_q (1=lowest, 5=highest)")
print(f"  Compound flags: is_cooling_desert_lep={occ['is_cooling_desert_lep'].sum()}, "
      f"is_cooling_desert_disability={occ['is_cooling_desert_disability'].sum()}")



# EXPORT

print("\n" + "=" * 60)
print("Exporting final datasets (EPSG:4326)")
print("=" * 60)

# Full analysis dataset
occ_export = occ.to_crs("EPSG:4326")
occ_export.to_file(f"{FINAL}/cooling_desert_index.geojson", driver="GeoJSON")
print(f"\n[A] {FINAL}/cooling_desert_index.geojson")
print(f"    {len(occ_export)} tracts × {len(occ_export.columns)} columns")

# Web-optimized: keep only columns needed for map layers + narrative
web_cols = [
    "GEOID", "borough", "nta2020", "cdta2020",
    # Heat vulnerability
    "HVI_RANK", "baseline_temp_f", "projected_temp_f",
    # Constraint variables
    "pct_rent_burden_50_plus", "pct_rent_burden_30_plus",
    "median_household_income", "pct_limited_english",
    "pct_disability", "pct_elderly_65_plus", "pct_children_under_18",
    "pct_black", "pct_hispanic", "pct_overcrowded_renter",
    "pct_renter", "renter_population",
    # Quantile classes for choropleth
    "hvi_rank_q", "rent_burden_q", "income_q", "lep_q",
    # Cooling desert flags
    "is_cooling_desert", "is_cooling_desert_lep", "is_cooling_desert_disability",
    "geometry",
]
web_cols = [c for c in web_cols if c in occ_export.columns]
web_gdf = occ_export[web_cols].copy()

# Round floats to 2 decimal places to reduce file size
for col in web_gdf.select_dtypes(include="float64").columns:
    web_gdf[col] = web_gdf[col].round(2)

web_gdf.to_file(f"{WEBDATA}/tract_map_data.geojson", driver="GeoJSON")
print(f"\n[B] {WEBDATA}/tract_map_data.geojson")
print(f"    {len(web_gdf)} tracts × {len(web_gdf.columns)} columns (web-optimized)")

# Save cool_it sites to web/data as GeoJSON for map layer
with open(f"{DATA}/cool_it_sites.json") as f:
    cool = pd.DataFrame(json.load(f))
cool_gdf = gpd.GeoDataFrame(
    cool,
    geometry=[Point(xy) for xy in zip(cool["longitude"], cool["latitude"])],
    crs="EPSG:4326",
)
cool_gdf.to_file(f"{WEBDATA}/cool_it_sites.geojson", driver="GeoJSON")
print(f"\n[C] {WEBDATA}/cool_it_sites.geojson ({len(cool_gdf)} sites)")

# NYCHA web layer
nycha_web = nycha_geo_clean[[
    "name", "borough", "borough_primary", "hvi_score_zcta",
    "avg_monthly_rent_usd", "is_senior_development",
    "total_population", "geometry"
]].to_crs("EPSG:4326")
nycha_web.to_file(f"{WEBDATA}/nycha_developments.geojson", driver="GeoJSON")
print(f"\n[D] {WEBDATA}/nycha_developments.geojson ({len(nycha_web)} developments)")

print("\n" + "=" * 60)
print("Summary")
print("=" * 60)
print(f"  Cooling deserts: {occ['is_cooling_desert'].sum()} tracts ({occ['is_cooling_desert'].sum()/len(occ)*100:.1f}%)")
print(f"  By borough:")
for b in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]:
    sub = occ[occ["borough"] == b]
    cd = sub["is_cooling_desert"].sum()
    print(f"    {b:15s}: {cd:3d} / {len(sub):3d} ({cd/len(sub)*100:.1f}%)")
print(f"\n  HVI coverage: 100% (NTA direct join + NN fallback)")
print(f"  Heat forecast coverage: {occ['baseline_temp_f'].notna().sum()}/{len(occ)} tracts")
print(f"\n✓ All fixes applied. Ready for spatial visualization.")
