

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy import stats
from shapely.geometry import Point
from shapely.ops import unary_union
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.tools.tools import add_constant
import scikit_posthocs as sp

warnings.filterwarnings("ignore")

DATA = "data/processed"

# HELPERS

def load_json(fname):
    with open(f"{DATA}/{fname}") as f:
        return pd.DataFrame(json.load(f))

def univariate(s, name):
    """Print descriptive statistics for a numeric Series."""
    s = s.dropna()
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    iqr_out = ((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum()
    skew_v = stats.skew(s)
    kurt_v = stats.kurtosis(s)
    sw_stat, sw_p = stats.shapiro(s[:5000])
    cv = s.std() / s.mean() * 100 if s.mean() != 0 else np.nan
    print(f"\n  [{name}]  n={len(s)}")
    print(f"  mean={s.mean():.2f} | median={s.median():.2f} | std={s.std():.2f} | CV={cv:.1f}%")
    print(f"  IQR={iqr:.2f} | skew={skew_v:.2f} | excess_kurt={kurt_v:.2f}")
    print(f"  P5={s.quantile(0.05):.2f}  P25={q1:.2f}  P50={s.median():.2f}  P75={q3:.2f}  P95={s.quantile(0.95):.2f}")
    normal = "approx normal" if sw_p > 0.05 else f"NOT normal (p={sw_p:.4f})"
    print(f"  Shapiro-Wilk: W={sw_stat:.4f} → {normal}")
    print(f"  IQR outliers: {iqr_out}")

def spearman(x, y, label_x, label_y):
    idx = x.dropna().index.intersection(y.dropna().index)
    r, p = stats.spearmanr(x[idx], y[idx])
    sig = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else "ns"))
    print(f"  {label_x} × {label_y}: r={r:+.3f} {sig}  (n={len(idx)})")
    return r, p

def section(title):
    print(f"\n{'='*60}")
    print(title)
    print("=" * 60)


# LOAD DATA

hvi = load_json("hvi_nta_components.json").drop_duplicates("nta_code", keep="first")
heat = load_json("outdoor_heat_forecast.json")
cool = load_json("cool_it_sites.json")
cooling_sum = load_json("cooling_locations_summary.json")
nycha_db = load_json("nycha_development_data_book.json")
nycha_db["rent_num"] = pd.to_numeric(nycha_db["avg_monthly_rent_usd"], errors="coerce")

gdf = gpd.read_file(f"{DATA}/nyc_tract_indicators_v2.geojson")
gdf["borough"] = gdf["COUNTYFP"].map(
    {"005": "Bronx", "047": "Brooklyn", "061": "Manhattan",
     "081": "Queens", "085": "Staten Island"}
)
occ = gdf[gdf["has_occupied_units"]].copy()

hvi_zcta = gpd.read_file(f"{DATA}/hvi_zcta.geojson")
zcta_bounds = gpd.read_file(f"{DATA}/nyc_zcta_boundaries.geojson")
nycha_geo = gpd.read_file(f"{DATA}/nycha_public_housing_developments.geojson")


# GEOGRAPHIC JOIN: Attach HVI score to census tracts via ZCTA

def attach_hvi_to_tracts(occ, hvi_zcta, zcta_bounds):
    """Spatial join: tract centroids → ZCTA → HVI score."""
    tracts_proj = occ.to_crs("EPSG:2263")
    zcta_proj = zcta_bounds.to_crs("EPSG:2263")
    cents = tracts_proj.copy()
    cents["geometry"] = tracts_proj.geometry.centroid
    joined = gpd.sjoin(
        cents[["GEOID", "borough", "geometry"]],
        zcta_proj[["ZCTA5CE20", "geometry"]],
        how="left", predicate="within"
    ).drop_duplicates("GEOID")
    hvi_zcta["zcta_key"] = hvi_zcta["zcta"].astype(str).str.zfill(5)
    joined["zcta_key"] = joined["ZCTA5CE20"].astype(str).str.zfill(5)
    joined_hvi = joined.merge(hvi_zcta[["zcta_key", "hvi_score"]], on="zcta_key", how="left")
    return occ.merge(joined_hvi[["GEOID", "hvi_score"]], on="GEOID", how="left")

occ_hvi = attach_hvi_to_tracts(occ, hvi_zcta, zcta_bounds)


# PHASE 1 — STRUCTURAL AUDIT

section("PHASE 1 — STRUCTURAL AUDIT")

datasets = {
    "hvi_nta_components (189 NTAs)": hvi,
    "outdoor_heat_forecast (262 NTAs)": heat,
    "cool_it_sites (218 sites)": cool,
    "cooling_locations_summary (10 rows)": cooling_sum,
    "nycha_development_data_book (346 devs)": nycha_db,
}
for name, df in datasets.items():
    mem = df.memory_usage(deep=True).sum() / 1024
    print(f"\n  {name}: {df.shape[0]}r × {df.shape[1]}c | {mem:.0f} KB")

print(f"\n  nyc_tract_indicators_v2 (GeoDataFrame):")
print(f"  {occ.shape[0]} occupied tracts × {occ.shape[1]} columns | CRS: {occ.crs}")


# PHASE 2 — DATA QUALITY

section("PHASE 2 — DATA QUALITY")

# HVI duplicates
print(f"\nHVI: 6 duplicate Staten Island NTA codes → drop to 189 unique NTAs")

# 'unknown' coded missingness in HVI level columns
for col in ["poverty_level", "greenspace_level", "surface_temp_level", "ac_access_level"]:
    n = (hvi[col] == "unknown").sum()
    pct = n / len(hvi) * 100
    flag = "⚠ HIGH" if pct > 10 else "ok"
    print(f"  {flag:6s} {col}: {n} 'unknown' ({pct:.1f}%)")

# Tract missingness
print("\nTract indicators — missing values (occupied tracts):")
for col in occ.columns:
    n = occ[col].isnull().sum()
    if n > 0:
        print(f"  {col}: {n} ({n/len(occ)*100:.1f}%)")

# Logical constraint
violations = (occ["pct_rent_burden_50_plus"] > occ["pct_rent_burden_30_plus"]).sum()
print(f"\n50% burden ≤ 30% burden constraint: {violations} violations {'✓' if violations==0 else '✗'}")

# Disability columns
print("\nDisability columns: pct_disability_x / _y are identical; use pct_disability")

# HVI range
print(f"\nHVI rank range: {hvi['hvi_rank'].min():.0f}–{hvi['hvi_rank'].max():.0f} ✓")

# NYCHA
print(f"\nNYCHA data book: senior_development 84% missing (treat NaN as non-senior)")
print(f"NYCHA data book: electricity_paid_by_residents 74% missing (drop column)")
print(f"NYCHA GeoJSON (218) vs data book (346): 128-record gap (Section 8 / scattered sites)")
print(f"NYCHA column typo: 'community_distirct' → standardise to community_district")

# Cool It! sites
out = ((cool["longitude"] < -74.26) | (cool["longitude"] > -73.70) |
       (cool["latitude"] < 40.48) | (cool["latitude"] > 40.93)).sum()
print(f"\nCool It! sites outside NYC bounds: {out} ✓")
print(f"Staten Island: 0 Cool It! sites in program data")


# PHASE 3 — UNIVARIATE ANALYSIS

section("PHASE 3 — UNIVARIATE ANALYSIS")

print("\n--- HVI dataset ---")
for col in ["pct_households_ac", "surface_temp_index", "pct_poverty", "pct_black", "hri_hosp_rate"]:
    univariate(hvi[col], col)

print("\n--- Tract indicators ---")
for col in ["pct_rent_burden_50_plus", "pct_rent_burden_30_plus",
            "median_household_income", "pct_housing_pre_1980",
            "pct_limited_english", "pct_disability",
            "pct_elderly_65_plus", "pct_black", "pct_hispanic"]:
    univariate(occ[col], col)

print("\n--- Heat forecast ---")
for col in ["baseline_temp_f", "projected_temp_f", "pct_managed_by_action"]:
    univariate(heat[col], col)

print("\n--- NYCHA rent ---")
univariate(nycha_db["rent_num"], "avg_monthly_rent_usd")

print("\n--- Cool It! sites by type ---")
print(cool["feature_type"].value_counts().to_string())


# PHASE 4 — BIVARIATE ANALYSIS

section("PHASE 4 — BIVARIATE ANALYSIS")

print("\nA. AC ownership vs HVI rank (Kruskal-Wallis)")
groups = [hvi[hvi["hvi_rank"] == r]["pct_households_ac"].dropna() for r in [1,2,3,4,5]]
h, p = stats.kruskal(*groups)
n_total = sum(len(g) for g in groups)
eta2 = (h - len(groups) + 1) / (n_total - len(groups))
print(f"  H={h:.3f}, p={p:.4f}, η²={eta2:.3f}")
for r, g in zip([1,2,3,4,5], groups):
    print(f"  Rank {r}: mean AC = {g.mean():.1f}% (n={len(g)})")

print("\nB. Cross-dataset — HVI score vs tract variables (Spearman)")
analysis = occ_hvi.dropna(subset=["hvi_score"])
for col, label in [
    ("pct_rent_burden_50_plus", "Severe rent burden"),
    ("median_household_income", "Median income"),
    ("pct_black", "pct Black"),
    ("pct_hispanic", "pct Hispanic"),
    ("pct_limited_english", "LEP"),
    ("pct_disability", "Disability"),
    ("pct_housing_pre_1980", "Pre-1980 housing"),
    ("pct_poverty_under_100", "Poverty"),
    ("pct_elderly_65_plus", "Elderly 65+"),
]:
    spearman(analysis["hvi_score"], analysis[col], "HVI score", label)

print("\nC. Within-tract bivariate pairs")
spearman(occ["pct_housing_pre_1980"], occ["pct_rent_burden_50_plus"],
         "Pre-1980 housing", "Severe rent burden")
spearman(occ["median_household_income"], occ["pct_rent_burden_50_plus"],
         "Income", "Severe rent burden")
spearman(occ["pct_hispanic"], occ["pct_limited_english"],
         "Hispanic", "LEP")
spearman(occ["pct_black"], occ["pct_limited_english"],
         "Black", "LEP")
spearman(occ["pct_elderly_65_plus"], occ["pct_rent_burden_50_plus"],
         "Elderly 65+", "Severe rent burden")


# PHASE 5 — MULTIVARIATE: Correlation matrix + VIF

section("PHASE 5 — MULTIVARIATE PATTERNS")

index_vars = [
    "pct_rent_burden_50_plus", "pct_housing_pre_1980",
    "pct_limited_english", "pct_disability",
    "median_household_income", "pct_hispanic",
    "pct_elderly_65_plus", "pct_poverty_under_100",
    "pct_overcrowded_renter",
]
sub = occ[index_vars].dropna()
corr = sub.corr(method="spearman")

print("\nHigh Spearman correlations |r| > 0.40 (potential redundancy for index):")
for i in range(len(corr.columns)):
    for j in range(i + 1, len(corr.columns)):
        r = corr.iloc[i, j]
        if abs(r) > 0.40:
            flag = "⚠ REDUNDANT" if abs(r) > 0.80 else ""
            print(f"  r={r:+.3f}  {corr.columns[i]} × {corr.columns[j]}  {flag}")

print("\nVIF analysis:")
sub_vif = sub.copy()
sub_vif["log_income"] = np.log(sub_vif["median_household_income"])
sub_vif = sub_vif.drop(columns=["median_household_income"])
X = add_constant(sub_vif.dropna())
for i in range(1, X.shape[1]):
    vif = variance_inflation_factor(X.values, i)
    flag = "⚠" if vif > 5 else ("~" if vif > 3 else " ")
    print(f"  {flag} {X.columns[i]:45s}: VIF={vif:.2f}")

print("\nJoint constraint quadrant (HVI≥4 × burden>30%):")
n = len(occ_hvi.dropna(subset=["hvi_score"]))
q_hvi = occ_hvi["hvi_score"] >= 4
q_bur = occ_hvi["pct_rent_burden_50_plus"] > 30
for label, mask in [
    ("High HVI + High Burden [COOLING DESERT]", q_hvi & q_bur),
    ("High HVI + Low Burden", q_hvi & ~q_bur),
    ("Low HVI + High Burden", ~q_hvi & q_bur),
    ("Low HVI + Low Burden", ~q_hvi & ~q_bur),
]:
    c = mask.sum()
    print(f"  {label:50s}: {c} ({c/n*100:.1f}%)")


# PHASE 6 — SPATIAL ANALYSIS

section("PHASE 6 — SPATIAL DISTRIBUTION")

#  6a. Cool It! walksheds
sites_gdf = gpd.GeoDataFrame(
    cool,
    geometry=[Point(xy) for xy in zip(cool["longitude"], cool["latitude"])],
    crs="EPSG:4326",
).to_crs("EPSG:2263")

tracts_proj = occ.to_crs("EPSG:2263")
tracts_proj["centroid"] = tracts_proj.geometry.centroid

buf_025 = unary_union(sites_gdf.geometry.buffer(1320))  # 0.25 mi
buf_050 = unary_union(sites_gdf.geometry.buffer(2640))  # 0.50 mi

covered_025 = tracts_proj["centroid"].apply(lambda pt: buf_025.contains(pt))
covered_050 = tracts_proj["centroid"].apply(lambda pt: buf_050.contains(pt))

n_total = len(tracts_proj)
print(f"\nCool It! 0.25-mi walkshed coverage: {covered_025.sum()} tracts ({covered_025.sum()/n_total*100:.1f}%)")
print(f"Cool It! 0.50-mi walkshed coverage: {covered_050.sum()} tracts ({covered_050.sum()/n_total*100:.1f}%)")
print(f"Tracts with NO site within 0.5 mi: {(~covered_050).sum()} ({(~covered_050).sum()/n_total*100:.1f}%)")

tracts_proj["covered_050"] = covered_050.values
tracts_proj["borough_col"] = occ["borough"].values
print("\nCoverage by borough (0.5-mi walkshed):")
for b in ["Bronx","Brooklyn","Manhattan","Queens","Staten Island"]:
    sub = tracts_proj[tracts_proj["borough_col"] == b]
    cov = sub["covered_050"].sum()
    print(f"  {b:15s}: {cov}/{len(sub)} ({cov/len(sub)*100:.1f}%)")

# 6b. NYCHA vs HVI zones 
nycha_proj = nycha_geo.to_crs("EPSG:2263")
nycha_proj["centroid_g"] = nycha_proj.geometry.centroid
nycha_cents = gpd.GeoDataFrame(nycha_proj, geometry="centroid_g", crs="EPSG:2263")
zcta_proj = zcta_bounds.to_crs("EPSG:2263")
nycha_zcta = gpd.sjoin(
    nycha_cents[["name","borough","centroid_g"]],
    zcta_proj[["ZCTA5CE20","geometry"]],
    how="left", predicate="within"
).drop_duplicates("name")
hvi_zcta["zcta_key"] = hvi_zcta["zcta"].astype(str).str.zfill(5)
nycha_zcta["zcta_key"] = nycha_zcta["ZCTA5CE20"].astype(str).str.zfill(5)
nycha_hvi = nycha_zcta.merge(hvi_zcta[["zcta_key","hvi_score"]], on="zcta_key", how="left")

matched = nycha_hvi["hvi_score"].notna().sum()
high_hvi = (nycha_hvi["hvi_score"] >= 4).sum()
print(f"\nNYCHA developments with HVI score: {matched}/218")
print(f"NYCHA in HVI zones 4–5: {high_hvi}/{matched} ({high_hvi/matched*100:.1f}%)")
print("\nNYCHA by borough × HVI:")
for b in ["BRONX","BROOKLYN","MANHATTAN","QUEENS","STATEN ISLAND"]:
    sub = nycha_hvi[nycha_hvi["borough"] == b]
    m = sub["hvi_score"].notna().sum()
    h = (sub["hvi_score"] >= 4).sum()
    mean_hvi = sub["hvi_score"].mean()
    print(f"  {b:15s}: n={m}, mean HVI={mean_hvi:.2f}, zones 4-5: {h} ({h/max(m,1)*100:.0f}%)")


# PHASE 7 — BOROUGH-LEVEL COMPARISON

section("PHASE 7 — BOROUGH-LEVEL COMPARISON")

boroughs = ["Bronx","Brooklyn","Manhattan","Queens","Staten Island"]
metrics = [
    ("hvi_score",               "HVI score",         "mean"),
    ("pct_rent_burden_50_plus", "Severe rent burden","median"),
    ("median_household_income", "Income",             "median"),
    ("pct_black",               "pct Black",         "median"),
    ("pct_hispanic",            "pct Hispanic",      "median"),
    ("pct_limited_english",     "LEP",               "median"),
    ("pct_disability",          "Disability",        "median"),
]
for col, label, agg_fn in metrics:
    groups = [occ_hvi[occ_hvi["borough"]==b][col].dropna() for b in boroughs]
    h, p = stats.kruskal(*[g for g in groups if len(g) > 0])
    n = sum(len(g) for g in groups)
    eta2 = (h - len(groups) + 1) / (n - len(groups))
    vals = [f"{getattr(g, agg_fn)():.1f}" for g in groups]
    vals_str = " | ".join(f"{b[:3]}:{v}" for b, v in zip(boroughs, vals))
    print(f"\n  {label:30s}  KW H={h:.1f} p={p:.4f} η²={eta2:.3f}")
    print(f"  {vals_str}")

print("\nDunn post-hoc (Bonferroni) on severe rent burden:")
df_dunn = pd.DataFrame({
    "val": np.concatenate([occ_hvi[occ_hvi["borough"]==b]["pct_rent_burden_50_plus"].dropna().values for b in boroughs]),
    "group": np.concatenate([[b]*len(occ_hvi[occ_hvi["borough"]==b]["pct_rent_burden_50_plus"].dropna()) for b in boroughs])
})
p_dunn = sp.posthoc_dunn(df_dunn, val_col="val", group_col="group", p_adjust="bonferroni")
print(p_dunn.round(4).to_string())


