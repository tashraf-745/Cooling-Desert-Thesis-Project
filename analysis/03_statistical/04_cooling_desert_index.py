"""
Phase 4 — Cooling Desert Index (CDI): Composite score construction
==================================================================
Builds a single continuous score (0–100) for every census tract.
Higher score = higher cooling desert risk.

Variables and weights (theory-driven, AUC=0.929 vs binary flag):
  HVI_RANK               25%  validated heat exposure composite
  pct_rent_burden_50_plus 20%  primary financial adaptive capacity constraint
  median_household_income 20%  economic capacity (inverted: low income = high risk)
  pct_black              15%  structural racial exposure (β=0.73 in regression)
  pct_limited_english     8%  communication barrier
  pct_disability          7%  physical vulnerability
  pct_overcrowded_renter  5%  housing constraint

Method:
  1. Min-max normalize each variable to [0, 1]
  2. Invert income so low income = high risk score
  3. Weighted average × 100

Validation:
  Desert mean CDI = 55.6 vs non-desert = 34.0 (+21.6 pts)
  Mann-Whitney U p < 0.001
  AUC = 0.929 (near-perfect discrimination)
  Q5 tracts (CDI 55-72): 71% are binary cooling deserts

Outputs:
  data/final/cooling_desert_index.geojson  — CDI + CDI_quintile columns added
  web/data/tract_map_data.geojson          — same columns added to web layer
  data/final/cdi_results.json             — weights, stats, top tracts

Run from project root:
  python analysis/03_statistical/04_cooling_desert_index.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy import stats
from sklearn.metrics import roc_auc_score

warnings.filterwarnings("ignore")

DATA    = "data/final/cooling_desert_index.geojson"
WEB     = "web/data/tract_map_data.geojson"
OUT     = "data/final"

# ── Variables and weights ──────────────────────────────────────
INDEX_VARS = [
    "HVI_RANK", "pct_rent_burden_50_plus", "pct_limited_english",
    "pct_disability", "median_household_income",
    "pct_overcrowded_renter", "pct_black",
]
WEIGHTS = {
    "HVI_RANK":               0.25,
    "pct_rent_burden_50_plus":0.20,
    "median_household_income":0.20,   # inverted
    "pct_black":              0.15,
    "pct_limited_english":    0.08,
    "pct_disability":         0.07,
    "pct_overcrowded_renter": 0.05,
}
INVERT = {"median_household_income"}  # lower income = higher risk

assert abs(sum(WEIGHTS.values()) - 1.0) < 0.001


# ── Load data ─────────────────────────────────────────────────
gdf = gpd.read_file(DATA)
df  = gdf[INDEX_VARS + ["GEOID", "borough", "is_cooling_desert"]].dropna().copy()
print(f"Tracts: {len(df)} | Cooling deserts: {df['is_cooling_desert'].sum()}")


# ── Normalize ─────────────────────────────────────────────────
norm = {}
norm_params = {}
for var in INDEX_VARS:
    s = df[var].astype(float)
    lo, hi = s.min(), s.max()
    s_norm  = (s - lo) / (hi - lo)
    if var in INVERT:
        s_norm = 1 - s_norm
    norm[var] = s_norm
    norm_params[var] = {"min": round(float(lo), 4),
                        "max": round(float(hi), 4),
                        "inverted": var in INVERT}

norm_df = pd.DataFrame(norm, index=df.index)


# ── Compute CDI ───────────────────────────────────────────────
df["CDI"] = (
    sum(norm_df[v] * w for v, w in WEIGHTS.items()) * 100
).round(2)

df["CDI_quintile"] = pd.qcut(
    df["CDI"], q=5, labels=[1, 2, 3, 4, 5]
).astype("Int64")


# ── Validate ──────────────────────────────────────────────────
deserts     = df[df["is_cooling_desert"] == 1]["CDI"]
non_deserts = df[df["is_cooling_desert"] == 0]["CDI"]
u_stat, u_p = stats.mannwhitneyu(deserts, non_deserts, alternative="greater")
auc = roc_auc_score(df["is_cooling_desert"].astype(float), df["CDI"])

SEP = "=" * 60
print(f"\n{SEP}")
print("VALIDATION")
print(SEP)
print(f"  Desert mean CDI:     {deserts.mean():.1f}")
print(f"  Non-desert mean CDI: {non_deserts.mean():.1f}")
print(f"  Gap:                 +{deserts.mean()-non_deserts.mean():.1f} pts")
print(f"  Mann-Whitney U:      {u_stat:.0f}, p={u_p:.2e}")
print(f"  AUC-ROC vs binary:   {auc:.4f}")

print("\nQuintile breakdown:")
for q, grp in df.groupby("CDI_quintile", observed=True):
    n_cd = grp["is_cooling_desert"].sum()
    pct  = n_cd / len(grp) * 100
    print(f"  Q{q} CDI {grp['CDI'].min():.0f}–{grp['CDI'].max():.0f}"
          f"  | {n_cd}/{len(grp)} binary deserts ({pct:.0f}%)")

print("\nMean CDI by borough:")
for b, grp in df.groupby("borough"):
    print(f"  {b:15s}: {grp['CDI'].mean():.1f}  "
          f"(range {grp['CDI'].min():.0f}–{grp['CDI'].max():.0f})")


# ── Write back to GeoJSON files ───────────────────────────────
for path in [DATA, WEB]:
    gdf_out = gpd.read_file(path)
    # Drop if already present from a previous run
    for col in ["CDI", "CDI_quintile"]:
        if col in gdf_out.columns:
            gdf_out = gdf_out.drop(columns=[col])
    gdf_out = gdf_out.merge(df[["GEOID", "CDI", "CDI_quintile"]], on="GEOID", how="left")
    for col in gdf_out.select_dtypes("float64").columns:
        gdf_out[col] = gdf_out[col].round(2)
    gdf_out.to_file(path, driver="GeoJSON")
    print(f"\nUpdated → {path}")


# ── Save metadata ─────────────────────────────────────────────
top10 = (
    df.nlargest(10, "CDI")
    [["GEOID", "borough", "CDI", "is_cooling_desert",
      "HVI_RANK", "pct_rent_burden_50_plus", "pct_black"]]
    .to_dict(orient="records")
)
results = {
    "weights": WEIGHTS,
    "normalization_params": norm_params,
    "validation": {
        "n_tracts": len(df),
        "n_deserts": int(df["is_cooling_desert"].sum()),
        "desert_mean_cdi": round(float(deserts.mean()), 2),
        "non_desert_mean_cdi": round(float(non_deserts.mean()), 2),
        "gap_points": round(float(deserts.mean() - non_deserts.mean()), 2),
        "mann_whitney_p": float(u_p),
        "auc_roc": round(float(auc), 4),
    },
    "cdi_range": {
        "min": round(float(df["CDI"].min()), 2),
        "max": round(float(df["CDI"].max()), 2),
        "mean": round(float(df["CDI"].mean()), 2),
        "std": round(float(df["CDI"].std()), 2),
    },
    "top_10_highest_risk_tracts": top10,
}

with open(f"{OUT}/cdi_results.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"Metadata saved → {OUT}/cdi_results.json")
print("\n✓ CDI construction complete. Proceed to Phase 5: Clustering.")
