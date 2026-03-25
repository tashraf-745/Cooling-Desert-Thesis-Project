import pandas as pd
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

# Step 1: Load and filter Cool It! NYC sites
df1 = pd.read_csv(RAW / "cool_it" / "Cool_It!_NYC_2020_-_Cooling_Sites_20260212.csv")
print(f"Cool It! total rows: {len(df1)}")
print("Status:", df1["Status"].value_counts().to_dict())
print("FeatureType:", df1["FeatureType"].value_counts().to_dict())

df1 = df1[df1["Status"] == "Activated"].copy()
df1 = df1.rename(columns={
    "FeatureType":  "feature_type",
    "PropertyName": "property_name",
    "Borough":      "borough",
    "x":            "longitude",
    "y":            "latitude",
})

df1["longitude"] = pd.to_numeric(df1["longitude"], errors="coerce")
df1["latitude"]  = pd.to_numeric(df1["latitude"],  errors="coerce")

missing_coords = df1[["longitude", "latitude"]].isna().any(axis=1).sum()
print(f"Rows dropped (missing coords): {missing_coords}")
df1 = df1.dropna(subset=["longitude", "latitude"])
df1 = df1[["feature_type", "property_name", "borough", "longitude", "latitude"]]

print(f"Activated sites exported: {len(df1)}")
df1.to_json(OUT / "cool_it_sites.json", orient="records", indent=2)
print("  → cool_it_sites.json")


# Step 2: Load cooling locations (spray showers and drinking fountains)
df2 = pd.read_csv(RAW / "cooling_centers" / "cooling-locations.csv")
print(f"\nCooling locations total rows: {len(df2)}")
print("Types:", df2["Type of Water Feature"].value_counts().to_dict())

df2 = df2.rename(columns={
    "PropName":              "property_name",
    "Borough":               "borough_code",
    "System":                "system_id",
    "Type of Water Feature": "feature_type",
})

borough_code_map = {"B": "Brooklyn", "Q": "Queens", "M": "Manhattan", "X": "Bronx", "R": "Staten Island"}
df2["borough"] = df2["borough_code"].map(borough_code_map)
df2 = df2[["property_name", "borough", "feature_type"]]

# Step 3: Export borough-level summary
summary = (
    df2.groupby(["borough", "feature_type"])
    .size()
    .reset_index(name="count")
    .sort_values(["borough", "feature_type"])
)
print("\nBorough summary:")
print(summary.to_string(index=False))

df2.to_json(OUT / "cooling_locations.json", orient="records", indent=2)
summary.to_json(OUT / "cooling_locations_summary.json", orient="records", indent=2)
print("\n  → cooling_locations.json")
print("  → cooling_locations_summary.json")
