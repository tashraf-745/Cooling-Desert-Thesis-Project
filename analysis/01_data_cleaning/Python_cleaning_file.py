import pandas as pd
import numpy as np
import geopandas as gpd
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

# Step 1: Load ACS data
df = pd.read_csv(RAW / "acs" / "nhgis0001_ds272_20245_tract.csv", dtype={"GEO_ID": str}, low_memory=False)
print(f"Rows: {len(df)} | Columns: {len(df.columns)}")

# Step 2: Drop margin of error columns
moe_cols = [c for c in df.columns if re.compile(r'M\d{3}$').search(c) or c == "NAME_M"]
df = df.drop(columns=moe_cols)
print(f"MOE columns dropped: {len(moe_cols)} | Remaining: {len(df.columns)}")

# Step 3: Rename geography columns and extract 11-digit tract GEOID
df = df.rename(columns={"GEO_ID": "geo_id", "COUNTY": "county", "STATE": "state"})
df = df.dropna(subset=["geo_id"])
df["geo_id"] = df["geo_id"].astype(str).str.strip().str[-11:]
print(f"Rows after geo cleanup: {len(df)}")

# Step 4: Confirm required columns exist
needed = [
    "AUUEE001", "AUUEE003",
    "AUWME001", "AUWME007", "AUWME008", "AUWME009", "AUWME010", "AUWME011",
    "AURNE001", "AURNE002", "AURNE003",
    "AUVCE008", "AUVCE011", "AUVCE012", "AUVCE013",
    "AURUE001",
    "AUOVE001",
    "AUOVE003", "AUOVE004", "AUOVE005", "AUOVE006",
    "AUOVE020", "AUOVE021", "AUOVE022", "AUOVE023", "AUOVE024", "AUOVE025",
    "AUOVE027", "AUOVE028", "AUOVE029", "AUOVE030",
    "AUOVE044", "AUOVE045", "AUOVE046", "AUOVE047", "AUOVE048", "AUOVE049",
    "AUO7E001", "AUO7E002", "AUO7E003", "AUO7E005",
    "AUPGE001", "AUPGE003",
    "AUP1E001", "AUP1E008",
    "AURME001",
    "AURME007", "AURME008", "AURME012", "AURME013", "AURME017", "AURME018", "AURME022", "AURME023",
    "AURME029", "AURME030", "AURME034", "AURME035", "AURME039", "AURME040", "AURME044", "AURME045",
    "AURME051", "AURME052", "AURME056", "AURME057", "AURME061", "AURME062", "AURME066", "AURME067",
    "AURTE001", "AURTE002", "AURTE003", "AURTE004", "AURTE005", "AURTE006",
    "AUURE001", "AUURE003",
    "AUVOE001", "AUVOE007", "AUVOE008", "AUVOE009", "AUVOE010", "AUVOE011",
]
missing = [c for c in needed if c not in df.columns]
if missing:
    raise SystemExit(f"Missing required columns: {missing}")

# Step 4b: Replace NHGIS suppression codes with NaN
NHGIS_MISSING = [-666666666, -999999999, -888888888]
for c in needed:
    df[c] = pd.to_numeric(df[c], errors="coerce").replace(NHGIS_MISSING, np.nan)
df = df.copy()

# Step 5: Compute derived variables
def safe_pct(numer, denom):
    numer = pd.to_numeric(numer, errors="coerce")
    denom = pd.to_numeric(denom, errors="coerce")
    return (numer / denom * 100).where((denom.notna()) & (denom != 0), np.nan).round(2)

# Percent renter
df["pct_renter"] = safe_pct(df["AUUEE003"], df["AUUEE001"])
df["has_occupied_units"] = pd.to_numeric(df["AUUEE001"], errors="coerce").fillna(0).gt(0)

# Rent burden 30%+ (cost-burdened)
rb30_cols = ["AUWME007", "AUWME008", "AUWME009", "AUWME010"]
rb30_num  = pd.to_numeric(df[rb30_cols].stack(), errors="coerce").unstack().sum(axis=1)
# Denominator excludes "not computed" households (AUWME011) to avoid deflating rate
rb_computed_denom = pd.to_numeric(df["AUWME001"], errors="coerce") - pd.to_numeric(df["AUWME011"], errors="coerce").fillna(0)
df["pct_rent_burden_30_plus"] = safe_pct(rb30_num, rb_computed_denom)

# Rent burden 50%+ (severely cost-burdened)
rb50_num = pd.to_numeric(df["AUWME010"], errors="coerce")
df["pct_rent_burden_50_plus"] = safe_pct(rb50_num, rb_computed_denom)

# Poverty under 100%
pov_num = pd.to_numeric(df[["AURNE002", "AURNE003"]].stack(), errors="coerce").unstack().sum(axis=1)
df["pct_poverty_under_100"] = safe_pct(pov_num, df["AURNE001"])

# Renter overcrowding
oc_num = pd.to_numeric(df[["AUVCE011", "AUVCE012", "AUVCE013"]].stack(), errors="coerce").unstack().sum(axis=1)
df["pct_overcrowded_renter"] = safe_pct(oc_num, df["AUVCE008"])

# Median household income
df["median_household_income"] = df["AURUE001"].astype("Int64")

# Elderly 65+
elderly_num = (
    pd.to_numeric(df[["AUOVE020","AUOVE021","AUOVE022","AUOVE023","AUOVE024","AUOVE025"]].stack(), errors="coerce").unstack().sum(axis=1) +
    pd.to_numeric(df[["AUOVE044","AUOVE045","AUOVE046","AUOVE047","AUOVE048","AUOVE049"]].stack(), errors="coerce").unstack().sum(axis=1)
)
df["pct_elderly_65_plus"] = safe_pct(elderly_num, df["AUOVE001"])

# Children under 18
children_num = (
    pd.to_numeric(df[["AUOVE003","AUOVE004","AUOVE005","AUOVE006"]].stack(), errors="coerce").unstack().sum(axis=1) +
    pd.to_numeric(df[["AUOVE027","AUOVE028","AUOVE029","AUOVE030"]].stack(), errors="coerce").unstack().sum(axis=1)
)
df["pct_children_under_18"] = safe_pct(children_num, df["AUOVE001"])

# Race
df["pct_white"]    = safe_pct(df["AUO7E002"], df["AUO7E001"])
df["pct_black"]    = safe_pct(df["AUO7E003"], df["AUO7E001"])
df["pct_asian"]    = safe_pct(df["AUO7E005"], df["AUO7E001"])
df["pct_hispanic"] = safe_pct(df["AUPGE003"], df["AUPGE001"])

# Living alone
df["pct_living_alone"] = safe_pct(df["AUP1E008"], df["AUP1E001"])

# Limited English proficiency
lep_cols = [
    "AURME007","AURME008","AURME012","AURME013","AURME017","AURME018","AURME022","AURME023",
    "AURME029","AURME030","AURME034","AURME035","AURME039","AURME040","AURME044","AURME045",
    "AURME051","AURME052","AURME056","AURME057","AURME061","AURME062","AURME066","AURME067",
]
lep_num = pd.to_numeric(df[lep_cols].stack(), errors="coerce").unstack().sum(axis=1)
df["pct_limited_english"] = safe_pct(lep_num, df["AURME001"])

# Low-income households under $30k
low_income_num = pd.to_numeric(df[["AURTE002","AURTE003","AURTE004","AURTE005","AURTE006"]].stack(), errors="coerce").unstack().sum(axis=1)
df["pct_low_income_households"] = safe_pct(low_income_num, df["AURTE001"])

# Renter population count
df["renter_population"] = pd.to_numeric(df["AUURE003"], errors="coerce").astype("Int64")

# Pre-1980 housing stock
pre1980_num = pd.to_numeric(df[["AUVOE007","AUVOE008","AUVOE009","AUVOE010","AUVOE011"]].stack(), errors="coerce").unstack().sum(axis=1)
df["pct_housing_pre_1980"] = safe_pct(pre1980_num, df["AUVOE001"])

# Step 5b: Sanity check
pct_cols = [
    "pct_renter","pct_rent_burden_30_plus","pct_rent_burden_50_plus","pct_poverty_under_100",
    "pct_overcrowded_renter","pct_elderly_65_plus","pct_children_under_18",
    "pct_white","pct_black","pct_asian","pct_hispanic",
    "pct_living_alone","pct_limited_english","pct_low_income_households","pct_housing_pre_1980",
]
print("\nSanity check — values > 100:")
for c in pct_cols:
    bad = df[c].dropna().gt(100).sum()
    if bad > 0:
        print(f"  {c}: {bad} tracts")
print("  Done.")

# Step 6: Export — NYC only
out_cols = [c for c in ["geo_id", "county", "state"] if c in df.columns] + [
    "has_occupied_units",
    "pct_renter", "pct_rent_burden_30_plus", "pct_rent_burden_50_plus",
    "pct_overcrowded_renter", "renter_population", "pct_housing_pre_1980",
    "pct_poverty_under_100", "pct_low_income_households", "median_household_income",
    "pct_elderly_65_plus", "pct_children_under_18",
    "pct_white", "pct_black", "pct_asian", "pct_hispanic",
    "pct_living_alone", "pct_limited_english",
]
df_out = df[out_cols].copy()

NYC_PREFIXES = {"36005", "36047", "36061", "36081", "36085"}
df_nyc = df_out[df_out["geo_id"].str[:5].isin(NYC_PREFIXES)].copy()

df_out.to_csv(OUT / "tract_indicators_v2.csv", index=False)
df_out.to_json(OUT / "tract_indicators_v2.json", orient="records", indent=2)
df_nyc.to_csv(OUT / "nyc_tract_indicators_v2.csv", index=False)
df_nyc.to_json(OUT / "nyc_tract_indicators_v2.json", orient="records", indent=2)
print(f"\nNY state rows: {len(df_out)} | NYC rows: {len(df_nyc)}")

# Step 7: Attach geometry and export GeoJSON
gdf = gpd.read_file(str(RAW / "shapefile" / "tl_2024_36_tract" / "tl_2024_36_tract.shp"))
NYC_FIPS = {"005", "047", "061", "081", "085"}
gdf_nyc = gdf[gdf["COUNTYFP"].isin(NYC_FIPS)].copy().to_crs("EPSG:4326")
print(f"Shapefile NYC tracts: {len(gdf_nyc)}")

gdf_merged = gdf_nyc.merge(df_nyc, left_on="GEOID", right_on="geo_id", how="left")
unjoined = gdf_merged["geo_id"].isna().sum()
print(f"Joined: {gdf_merged['geo_id'].notna().sum()} / {len(gdf_merged)} | Unjoined: {unjoined}")

keep_cols = [c for c in [
    "GEOID", "COUNTYFP", "NAME", "geometry", "has_occupied_units",
    "pct_renter", "pct_rent_burden_30_plus", "pct_rent_burden_50_plus",
    "pct_overcrowded_renter", "renter_population", "pct_housing_pre_1980",
    "pct_poverty_under_100", "pct_low_income_households", "median_household_income",
    "pct_elderly_65_plus", "pct_children_under_18",
    "pct_white", "pct_black", "pct_asian", "pct_hispanic",
    "pct_living_alone", "pct_limited_english",
] if c in gdf_merged.columns]

gdf_merged[keep_cols].to_file(str(OUT / "nyc_tract_indicators_v2.geojson"), driver="GeoJSON")
print(f"  → nyc_tract_indicators_v2.geojson")
