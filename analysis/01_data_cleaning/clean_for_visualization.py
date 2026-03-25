import json
import re
import pandas as pd
import geopandas as gpd
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

HTML_TAG = re.compile(r'<[^>]+>')

def strip_html(v):
    return HTML_TAG.sub("", str(v)).strip() if pd.notna(v) else v

def save_json(obj, filename):
    with open(OUT / filename, "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    size_kb = (OUT / filename).stat().st_size / 1024
    print(f"  → {filename} ({size_kb:.0f} KB)")


# ── 1. HVI NTA Components — strip HTML, clean labels, add NTA_6 join key ─────
print("\n[1] HVI NTA Components")
df = pd.read_csv(RAW / "hvi" / "hvi_nta_components.csv", encoding="utf-8-sig")

TERT_MAP = {
    "Higher than most NYC neighborhoods":  "above_average",
    "More than most NYC neighborhoods":    "above_average",
    "Less than most NYC neighborhoods":    "below_average",
    "Fewer than most NYC neighborhoods":   "below_average",
    "In the middle of NYC neighborhoods":  "average",
}
for col in ["POV_TERT", "GREENSPACE_TERT", "SURFACETEMP_TERT", "AC_TERT"]:
    df[col] = df[col].apply(strip_html).map(TERT_MAP).fillna("unknown")

df = df.rename(columns={
    "NTACode":          "nta_code",
    "GEOCODE":          "geocode",
    "GEONAME":          "nta_name",
    "POV_PCT":          "pct_poverty",
    "PCT_BLACK_POP":    "pct_black",
    "GREENSPACE":       "pct_greenspace",
    "SURFACETEMP":      "surface_temp_index",
    "PCT_HOUSEHOLDS_AC":"pct_households_ac",
    "HVI_RANK":         "hvi_rank",
    "CD":               "community_district",
    "HRI_HOSP_RATE":    "hri_hosp_rate",
    "POV_TERT":         "poverty_level",
    "GREENSPACE_TERT":  "greenspace_level",
    "SURFACETEMP_TERT": "surface_temp_level",
    "AC_TERT":          "ac_access_level",
})
df = df.dropna(subset=["nta_code"])

# Add 6-char NTA code for joining with outdoor_heat_forecast (nta_code[:4] → match)
# HVI uses 4-char (BX01), forecast uses 6-char (BX0101). Pad to enable partial join.
df["nta_code_4"] = df["nta_code"].str[:4]

save_json(df.to_dict(orient="records"), "hvi_nta_components.json")
print(f"  {len(df)} NTAs | HTML stripped | columns renamed")


# ── 2. HVI Rankings 2024 — standardize column names ──────────────────────────
print("\n[2] HVI Rankings 2024")
df2 = pd.read_csv(RAW / "hvi" / "Heat_Vulnerability_Index_Rankings_2024.csv")
df2.columns = ["zcta", "hvi_score"]
df2["zcta"] = df2["zcta"].astype(str).str.zfill(5)
df2["hvi_score"] = pd.to_numeric(df2["hvi_score"], errors="coerce").astype("Int64")
save_json(df2.to_dict(orient="records"), "hvi_rankings_2024.json")
print(f"  {len(df2)} ZCTAs")


# ── 3. Outdoor Heat Forecast — standardize NTA code to 4-char for HVI join ───
print("\n[3] Outdoor Heat Forecast")
df3 = pd.read_csv(
    RAW / "hvi" / "NYC_Climate_Budgeting_Report__Resiliency_Exposure_Forecast_-_Outdoor_Heat_20260212.csv"
)
df3 = df3.rename(columns={
    "NTA_Code":                     "nta_code",
    "NTA_Name":                     "nta_name",
    "Baseline":                     "baseline_temp_f",
    "Control_Scenario_Temperature": "projected_temp_f",
    "Planned_Action_Temperature":   "planned_action_temp_f",
    "Percent_Managed_by_Action":    "pct_managed_by_action",
})
df3 = df3.drop(columns=["PUBLICATION_DATE", "NTAAbbrev"], errors="ignore")
for c in ["baseline_temp_f", "projected_temp_f", "planned_action_temp_f", "pct_managed_by_action"]:
    df3[c] = pd.to_numeric(df3[c], errors="coerce").round(2)
# Add 4-char NTA code for joining with HVI components
df3["nta_code_4"] = df3["nta_code"].str[:4]
save_json(df3.to_dict(orient="records"), "outdoor_heat_forecast.json")
print(f"  {len(df3)} NTAs | nta_code_4 added for HVI join")


# ── 4. NTA-ZIP Crosswalk — normalize codes ───────────────────────────────────
print("\n[4] NTA-ZIP Crosswalk")
with open(RAW / "hvi" / "nta_zip_collapsed.json") as f:
    xwalk = json.load(f)
df4 = pd.DataFrame(xwalk)
df4 = df4.rename(columns={"GEOCODE": "geocode", "NTACode": "nta_code", "NTAName": "nta_name", "zipcode": "zipcodes"})
df4["nta_code_4"] = df4["nta_code"].str[:4]
save_json(df4.to_dict(orient="records"), "nta_zip_crosswalk.json")
print(f"  {len(df4)} entries | nta_code_4 added")


# ── 5. NYCHA Development Data Book — clean currency, handle nulls ─────────────
print("\n[5] NYCHA Development Data Book")
df5 = pd.read_csv(RAW / "nycha" / "nycha_development_data_book.csv", encoding="utf-8-sig")

# Remove $ and commas from rent column
df5["AVG MONTHLY GROSS RENT"] = (
    df5["AVG MONTHLY GROSS RENT"].astype(str).str.replace(r'[\$,]', '', regex=True)
    .pipe(pd.to_numeric, errors="coerce")
)
# Standardize borough — split cross-borough entries into primary borough
df5["BOROUGH_PRIMARY"] = df5["BOROUGH"].str.split("/").str[0].str.strip()
# Normalize column names
df5.columns = [c.lower().replace(" ", "_").replace("#", "num").replace("/", "_") for c in df5.columns]
df5 = df5.rename(columns={"avg_monthly_gross_rent": "avg_monthly_rent_usd"})

# Drop internal admin columns not needed for visualization
drop_cols = ["hud_amp_num", "tds_num", "consolidated_tdsnum", "development_edp_num",
             "operating_edp_num", "hud_num", "data_as_of"]
df5 = df5.drop(columns=[c for c in drop_cols if c in df5.columns])

save_json(df5.to_dict(orient="records"), "nycha_development_data_book.json")
print(f"  {len(df5)} developments | rent parsed | borough_primary added")
print(f"  avg_monthly_rent_usd nulls: {df5['avg_monthly_rent_usd'].isna().sum()}")


# ── 6. ACS Disability — compute total disabled count and rate ─────────────────
print("\n[6] ACS Disability")
df6 = pd.read_csv(RAW / "acs" / "disability_b18101_nyc_tracts.csv")
# Sum all "with a disability" cells (male + female across all age groups)
disability_cols = [c for c in df6.columns if c.startswith("B18101_") and c != "B18101_001E"]
df6["total_with_disability"] = df6[disability_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)
df6["pct_disability"] = (df6["total_with_disability"] / pd.to_numeric(df6["B18101_001E"], errors="coerce") * 100).round(2)
# Build geo_id to match GEOID in tract indicators
df6["geo_id"] = df6["state"].astype(str) + df6["county"].astype(str).str.zfill(3) + df6["tract"].astype(str).str.zfill(6)
df6_out = df6[["geo_id", "total_with_disability", "pct_disability"]].copy()
save_json(df6_out.to_dict(orient="records"), "acs_disability_b18101.json")
print(f"  {len(df6_out)} tracts | pct_disability computed")


# ── 7. NYC Tract Indicators — merge disability in ─────────────────────────────
print("\n[7] NYC Tract Indicators + Disability merge")
gdf = gpd.read_file(str(OUT / "nyc_tract_indicators_v2.geojson"))
gdf = gdf.drop(columns=["total_with_disability", "pct_disability", "geo_id"], errors="ignore")
gdf = gdf.merge(df6_out, left_on="GEOID", right_on="geo_id", how="left")
gdf = gdf.drop(columns=["geo_id"], errors="ignore")
gdf.to_file(str(OUT / "nyc_tract_indicators_v2.geojson"), driver="GeoJSON")
print(f"  {len(gdf)} tracts | disability merged: {gdf['pct_disability'].notna().sum()}")


# ── 8. NYCHVS — add BORO from allunits, decode RENTBURDEN_CAT ─────────────────
print("\n[8] NYCHVS Occupied — add BORO, decode rent burden")
df_occ = pd.read_csv(RAW / "nychvs" / "occupied_puf_21.csv")
df_all = pd.read_csv(RAW / "nychvs" / "allunits_puf_21.csv")

# Merge BORO from allunits into occupied via CONTROL
df_occ = df_occ.merge(df_all[["CONTROL", "BORO"]], on="CONTROL", how="left")

BORO_MAP = {1: "Bronx", 2: "Brooklyn", 3: "Manhattan", 4: "Queens", 5: "Staten Island"}
RENTBURDEN_MAP = {-2: None, 1: "less_than_30pct", 2: "30_to_50pct", 3: "50pct_or_more", 4: "not_computed"}

df_occ = df_occ.copy()
df_occ["borough"]     = df_occ["BORO"].map(BORO_MAP)
df_occ["rent_burden"] = df_occ["RENTBURDEN_CAT"].map(RENTBURDEN_MAP)

# Keep only renter households (TENURE=2) with valid rent burden
df_renters = df_occ[df_occ["TENURE"] == 1].copy()
df_renters = df_renters[df_renters["rent_burden"].notna()]

keep = ["CONTROL", "TENURE", "borough", "rent_burden", "FW",
        "HHSIZE", "HHINC_REC1", "HHPOVERTY",
        "NOHEAT", "NOHOTWATER", "UTIL_ELECTRIC", "UTIL_GAS",
        "UTILCOSTS_SUMMER", "UTILCOSTS_WINTER", "INTERUPT_UTIL",
        "MOLD", "LEAKS", "PEELPAINT", "RENTASSIST",
        "HH62PLUS", "HHUNDER18", "PA_ANY", "FOODINSECURE",
        "CROWD_RM", "HHDONEPLUS"]
df_renters = df_renters[[c for c in keep if c in df_renters.columns]]

save_json(df_renters.to_dict(orient="records"), "nychvs_renters.json")
print(f"  {len(df_renters)} renter households | borough added | rent_burden decoded")
print(f"  Weighted renter HHs: {df_renters['FW'].sum():,.0f}")
print(f"  rent_burden distribution: {df_renters['rent_burden'].value_counts().to_dict()}")
print(f"  borough distribution: {df_renters['borough'].value_counts().to_dict()}")


# ── Summary ───────────────────────────────────────────────────────────────────
print("\n[Summary] data/processed/ visualization-ready files:")
files = sorted(OUT.iterdir())
for f in files:
    if f.suffix in [".json", ".geojson", ".csv"]:
        kb = f.stat().st_size / 1024
        print(f"  {f.name:<50} {kb/1024:.1f} MB" if kb > 1024 else f"  {f.name:<50} {kb:.0f} KB")
