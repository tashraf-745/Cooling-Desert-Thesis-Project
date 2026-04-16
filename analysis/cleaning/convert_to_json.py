import csv
import json
import re
import os
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)


def csv_to_json(input_path, output_path):
    rows = []
    with open(input_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            clean = {}
            for k, v in row.items():
                v = v.strip() if v else ""
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
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"))
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"  {os.path.basename(output_path)}: {len(rows):,} records — {size_mb:.1f} MB")
    return rows


def parse_wkt_multipolygon(wkt):
    wkt = wkt.strip()

    def parse_ring(coords_str):
        pairs = coords_str.strip().split(",")
        return [[float(x) for x in p.strip().split()] for p in pairs if p.strip()]

    if wkt.startswith("MULTIPOLYGON"):
        inner = wkt[len("MULTIPOLYGON"):].strip()
        polygons = re.findall(r'\(\(([^()]+)\)\)', inner)
        coordinates = [[parse_ring(p)] for p in polygons]
        return {"type": "MultiPolygon", "coordinates": coordinates}

    if wkt.startswith("POLYGON"):
        inner = wkt[len("POLYGON"):].strip()
        rings = re.findall(r'\(([^()]+)\)', inner)
        coordinates = [parse_ring(r) for r in rings]
        return {"type": "Polygon", "coordinates": [coordinates]}

    return None


def nycha_developments_to_geojson(input_path, output_path):
    features = []
    skipped = 0
    with open(input_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            wkt = row.get("the_geom", "").strip()
            geometry = parse_wkt_multipolygon(wkt) if wkt else None
            if geometry is None:
                skipped += 1
                continue
            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "name":    row.get("DEVELOPMEN", "").strip(),
                    "tds_num": row.get("TDS_NUM", "").strip(),
                    "borough": row.get("BOROUGH", "").strip(),
                },
            })
    geojson = {"type": "FeatureCollection", "features": features}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, separators=(",", ":"))
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"  {os.path.basename(output_path)}: {len(features):,} features — {size_mb:.1f} MB (skipped {skipped})")


# NYCHVS 2021
print("\n--- NYCHVS 2021 ---")
for fname in ["allunits_puf_21.csv", "occupied_puf_21.csv", "vacant_puf_21.csv", "person_puf_21.csv"]:
    src = RAW / "nychvs" / fname
    dst = OUT / fname.replace(".csv", ".json")
    if src.exists():
        csv_to_json(src, dst)
    else:
        print(f"  MISSING: {fname}")

# NYCHA
print("\n--- NYCHA ---")
src = RAW / "nycha" / "nycha_development_data_book.csv"
dst = OUT / "nycha_development_data_book.json"
if src.exists():
    csv_to_json(src, dst)
else:
    print("  MISSING: nycha_development_data_book.csv")

src = RAW / "nycha" / "nycha_public_housing_developments.csv"
dst = OUT / "nycha_public_housing_developments.geojson"
if src.exists():
    nycha_developments_to_geojson(src, dst)
else:
    print("  MISSING: nycha_public_housing_developments.csv")

print("\nDone. Files saved to data/processed/")
