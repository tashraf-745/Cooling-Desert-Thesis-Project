"""
Phase 3 — PCA: Find variable structure before index construction
================================================================
Purpose:
  Identify which candidate index variables are measuring the same
  underlying dimension (redundant) vs. genuinely independent dimensions.
  This informs which variables to include in the Cooling Desert Index.

Three components found:
  PC1 (33.1%) — Economic Deprivation (income, poverty, rent burden)
  PC2 (18.1%) — Black vs. Hispanic/LEP Contrast (pct_black +0.619,
                  pct_limited_english -0.489; bipolar axis separating
                  majority-Black English-speaking from Hispanic/immigrant tracts)
  PC3 (13.2%) — Age/Physical Vulnerability (elderly, disability)

Decision: 7 of 10 candidates retained for index.
  DROP: pct_poverty_under_100 (r=-0.74 with income, same PC1 axis)
  DROP: pct_hispanic (absorbed by LEP + overcrowding in regression)
  DROP: pct_elderly_65_plus (use in cross-tabulations instead)

Run from project root:
  python analysis/statistical/03_pca.py
"""

import json
import warnings
import pandas as pd
import geopandas as gpd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

warnings.filterwarnings("ignore")

DATA = "data/final/cooling_desert_index.geojson"
OUT  = "data/final"

# ── Load data ─────────────────────────────────────────────────
gdf = gpd.read_file(DATA)

candidates = [
    "HVI_RANK", "pct_rent_burden_50_plus", "pct_limited_english",
    "pct_disability", "median_household_income", "pct_overcrowded_renter",
    "pct_poverty_under_100", "pct_black", "pct_hispanic", "pct_elderly_65_plus",
]
df = gdf[candidates].dropna().copy()
print(f"Sample: {len(df)} tracts, {len(candidates)} candidate variables")

# ── Standardize ───────────────────────────────────────────────
scaler = StandardScaler()
X_std  = scaler.fit_transform(df)

# ── Full PCA (all components) — for scree analysis ───────────
pca_full = PCA()
pca_full.fit(X_std)

print("\nVariance explained per component:")
cum = 0
n_keep = 0
for i, (ev, vr) in enumerate(zip(pca_full.explained_variance_,
                                   pca_full.explained_variance_ratio_)):
    cum += vr * 100
    keep = ev > 1.0
    if keep:
        n_keep += 1
    print(f"  PC{i+1}: eigenvalue={ev:.3f}  {vr*100:.1f}%  cumulative={cum:.1f}%"
          f"  {'← keep' if keep else ''}")

# ── 3-component solution ──────────────────────────────────────
pca3 = PCA(n_components=3)
scores = pca3.fit_transform(X_std)

# PC2 is a CONTRAST axis: pct_black (+0.619) vs pct_limited_english (-0.489)
# High PC2 = majority Black, English-speaking; Low PC2 = Hispanic/immigrant/LEP
# Not a single "racial composition" dimension — renamed accordingly
loadings = pd.DataFrame(
    pca3.components_.T,
    index=candidates,
    columns=["PC1_econ_deprivation",
             "PC2_black_vs_hispanic_lep",
             "PC3_age_vulnerability"]
)

communalities = (pca3.components_.T ** 2).sum(axis=1)
communality_df = pd.Series(communalities, index=candidates, name="communality")

print(f"\nTotal variance explained (3 components): "
      f"{pca3.explained_variance_ratio_.sum()*100:.1f}%")

# ── Component names and interpretation ───────────────────────
component_info = {
    "PC1_econ_deprivation": {
        "variance_pct": round(float(pca3.explained_variance_ratio_[0]*100), 1),
        "name": "Economic Deprivation",
        "description": (
            "High scores = low income, high poverty, high rent burden, "
            "overcrowding. This is the economic squeeze axis."
        ),
        "top_loaders": ["median_household_income(-)", "pct_poverty_under_100(+)",
                        "pct_rent_burden_50_plus(+)"],
    },
    "PC2_black_vs_hispanic_lep": {
        "variance_pct": round(float(pca3.explained_variance_ratio_[1]*100), 1),
        "name": "Black vs. Hispanic/LEP Contrast",
        "description": (
            "Bipolar axis: pct_black loads +0.619, pct_limited_english loads -0.489. "
            "High scores = majority Black, English-speaking neighborhoods "
            "(South Bronx, East Brooklyn). Low scores = majority Hispanic, "
            "immigrant/LEP neighborhoods (Jackson Heights, Sunset Park). "
            "Both sit apart from PC1 — community racial/ethnic structure is "
            "independent of economic deprivation."
        ),
        "top_loaders": ["pct_black(+0.619)", "pct_limited_english(-0.489)",
                        "pct_hispanic(-0.262)"],
    },
    "PC3_age_vulnerability": {
        "variance_pct": round(float(pca3.explained_variance_ratio_[2]*100), 1),
        "name": "Age / Physical Vulnerability",
        "description": (
            "High scores = higher elderly and disability share. "
            "These populations are physiologically vulnerable but not "
            "necessarily the poorest — older, more stable neighborhoods."
        ),
        "top_loaders": ["pct_elderly_65_plus(+)", "pct_disability(+)"],
    },
}

# ── Variable selection decision ───────────────────────────────
index_variables = [
    "HVI_RANK",
    "pct_rent_burden_50_plus",
    "pct_limited_english",
    "pct_disability",
    "median_household_income",
    "pct_overcrowded_renter",
    "pct_black",
]

dropped_variables = {
    "pct_poverty_under_100": (
        "r=-0.74 with income — same PC1 axis. "
        "Including both double-counts economic deprivation."
    ),
    "pct_hispanic": (
        "Not significant in logistic regression once income, pct_black, "
        "and LEP are controlled. Heat signal runs through LEP/overcrowding."
    ),
    "pct_elderly_65_plus": (
        "PC3 signal but protective in regression (OR ns). "
        "Use in cross-tabulations for compound vulnerability analysis."
    ),
}

print("\nVariables selected for Cooling Desert Index:")
for v in index_variables:
    print(f"  ✓ {v}")
print("\nVariables dropped:")
for v, reason in dropped_variables.items():
    print(f"  ✗ {v}: {reason}")

# ── Save results ──────────────────────────────────────────────
results = {
    "n_components_kept": 3,
    "total_variance_explained_pct": round(
        float(pca3.explained_variance_ratio_.sum() * 100), 1
    ),
    "components": component_info,
    "loadings": {
        var: {pc: round(float(loadings.loc[var, pc]), 4)
              for pc in loadings.columns}
        for var in candidates
    },
    "communalities": {
        var: round(float(communality_df[var]), 4) for var in candidates
    },
    "index_variables_selected": index_variables,
    "variables_dropped": dropped_variables,
}

with open(f"{OUT}/pca_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nResults saved → {OUT}/pca_results.json")
print("→ Proceed to Phase 4: build the Cooling Desert Index using 7 variables.")
