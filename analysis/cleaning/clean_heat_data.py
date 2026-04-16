import pandas as pd
import geopandas as gpd
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw"
OUT  = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

# Load HVI rankings and filter to NYC ZCTAs
df_hvi = pd.read_csv(RAW / "hvi" / "Heat_Vulnerability_Index_Rankings_2024.csv")
df_hvi.columns = ["zcta", "hvi_score"]
df_hvi["zcta"]      = df_hvi["zcta"].astype(str).str.strip().str.zfill(5)
df_hvi["hvi_score"] = pd.to_numeric(df_hvi["hvi_score"], errors="coerce").astype("Int64")

print(f"HVI ZCTAs: {len(df_hvi)}")
print(df_hvi["hvi_score"].value_counts().sort_index().to_string())

nyc_zctas = set(df_hvi["zcta"].dropna())

# Load ZCTA shapefile and filter to NYC
print("\nLoading ZCTA shapefile...")
gdf_zcta = gpd.read_file(str(RAW / "shapefile" / "tl_2020_us_zcta520" / "tl_2020_us_zcta520.shp"))
gdf_zcta["ZCTA5CE20"] = gdf_zcta["ZCTA5CE20"].astype(str).str.zfill(5)
gdf_nyc_zcta = gdf_zcta[gdf_zcta["ZCTA5CE20"].isin(nyc_zctas)].copy()
print(f"NYC ZCTAs matched: {len(gdf_nyc_zcta)} / {len(nyc_zctas)}")

# Join HVI to geometry and export
gdf_nyc_zcta = gdf_nyc_zcta.to_crs("EPSG:4326")
gdf_merged = gdf_nyc_zcta.merge(df_hvi, left_on="ZCTA5CE20", right_on="zcta", how="left")
gdf_merged = gdf_merged[["ZCTA5CE20", "hvi_score", "geometry"]].rename(columns={"ZCTA5CE20": "zcta"})

print(f"Matched HVI scores: {gdf_merged['hvi_score'].notna().sum()} / {len(gdf_merged)}")
gdf_merged.to_file(str(OUT / "hvi_zcta.geojson"), driver="GeoJSON")
print("  → hvi_zcta.geojson")


# Load and clean outdoor heat forecast
df_heat = pd.read_csv(
    RAW / "hvi" / "NYC_Climate_Budgeting_Report__Resiliency_Exposure_Forecast_-_Outdoor_Heat_20260212.csv"
)
df_heat = df_heat.rename(columns={
    "NTA_Code":                     "nta_code",
    "NTA_Name":                     "nta_name",
    "Baseline":                     "baseline_temp_f",
    "Control_Scenario_Temperature": "projected_temp_f",
    "Planned_Action_Temperature":   "planned_action_temp_f",
    "Percent_Managed_by_Action":    "pct_managed_by_action",
})
df_heat = df_heat.drop(columns=["PUBLICATION_DATE", "NTAAbbrev"], errors="ignore")

for c in ["baseline_temp_f", "projected_temp_f", "planned_action_temp_f", "pct_managed_by_action"]:
    df_heat[c] = df_heat[c].round(2)

print(f"\nOutdoor Heat Forecast NTAs: {len(df_heat)}")
df_heat.to_json(OUT / "outdoor_heat_forecast.json", orient="records", indent=2)
print("  → outdoor_heat_forecast.json")
