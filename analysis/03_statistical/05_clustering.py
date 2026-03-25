"""
Phase 5 — K-means Clustering: Risk typologies
==============================================
Finds natural groupings of tracts by their structural risk profile.
Answers: not just WHERE cooling deserts are, but WHY they exist.

5 clusters (k chosen by silhouette + interpretability):
  1 — Low Risk — Affluent & Low Exposure       (15%, CDI=15.7)
  2 — Moderate Risk — Financially Strained     (29%, CDI=31.6)
  3 — High Risk — Immigrant Heat Burden        (20%, CDI=42.9)
  4 — High Risk — Racial Heat Burden           (21%, CDI=53.7)
  5 — Extreme Risk — Compound Deprivation      (15%, CDI=54.1)

Kruskal-Wallis H=1694.5, p<0.001 — clusters are statistically distinct.

Outputs:
  data/final/cooling_desert_index.geojson  — cluster + cluster_name added
  web/data/tract_map_data.geojson          — same columns added
  data/final/cluster_results.json         — profiles + policy notes

Run from project root:
  python analysis/03_statistical/05_clustering.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from scipy import stats

warnings.filterwarnings("ignore")

DATA = "data/final/cooling_desert_index.geojson"
WEB  = "web/data/tract_map_data.geojson"
OUT  = "data/final"

CLUSTER_VARS = [
    "HVI_RANK", "pct_rent_burden_50_plus", "pct_limited_english",
    "pct_disability", "median_household_income",
    "pct_overcrowded_renter", "pct_black",
]

CLUSTER_NAMES = {
    1: "Low Risk — Affluent & Low Exposure",
    2: "Moderate Risk — Financially Strained",
    3: "High Risk — Immigrant Heat Burden",
    4: "High Risk — Racial Heat Burden",
    5: "Extreme Risk — Compound Deprivation",
}

CLUSTER_POLICY = {
    1: "No immediate intervention required.",
    2: "Monitor; rent stabilization and income support.",
    3: "Multilingual cooling outreach; overcrowding enforcement.",
    4: "Targeted AC retrofit programs; tree canopy investment.",
    5: "Emergency cooling access; NYCHA surcharge waiver; disability-adapted outreach.",
}


# ── Load and fit ───────────────────────────────────────────────
gdf = gpd.read_file(DATA)
df  = gdf[CLUSTER_VARS + ["GEOID","borough","CDI","is_cooling_desert"]].dropna().copy()
print(f"Tracts: {len(df)}")

scaler = StandardScaler()
X = scaler.fit_transform(df[CLUSTER_VARS])

# Silhouette scan
print("\nSilhouette scores:")
for k in range(2, 9):
    km_  = KMeans(n_clusters=k, random_state=42, n_init=10)
    lbl_ = km_.fit_predict(X)
    sil_ = silhouette_score(X, lbl_, sample_size=1000, random_state=42)
    print(f"  k={k}: {sil_:.4f}")

# Fit final model
km = KMeans(n_clusters=5, random_state=42, n_init=10)
df["cluster_raw"] = km.fit_predict(X)

# Order clusters by mean CDI (1=lowest risk, 5=highest)
order = df.groupby("cluster_raw")["CDI"].mean().sort_values().index.tolist()
df["cluster"] = df["cluster_raw"].map(
    {orig: rank + 1 for rank, orig in enumerate(order)}
).astype("Int64")
df["cluster_name"] = df["cluster"].map(CLUSTER_NAMES)

# ── Profile each cluster ───────────────────────────────────────
SEP = "=" * 65
print(f"\n{SEP}")
print("CLUSTER PROFILES")
print(SEP)

profile_rows = []
for c in range(1, 6):
    sub = df[df["cluster"] == c]
    cd_pct = sub["is_cooling_desert"].mean() * 100
    top_boroughs = sub["borough"].value_counts(normalize=True).head(3)

    print(f"\nCluster {c} — {CLUSTER_NAMES[c]}")
    print(f"  n={len(sub)} ({len(sub)/len(df)*100:.0f}%) | "
          f"CDI={sub['CDI'].mean():.1f} | {cd_pct:.0f}% cooling deserts")
    for v in CLUSTER_VARS:
        print(f"  {v:35s}: {sub[v].mean():.1f}")
    boro_str = "  ".join(f"{b}:{p*100:.0f}%" for b, p in top_boroughs.items())
    print(f"  Boroughs: {boro_str}")
    print(f"  Policy: {CLUSTER_POLICY[c]}")

    profile_rows.append({
        "cluster": int(c),
        "name": CLUSTER_NAMES[c],
        "policy_lever": CLUSTER_POLICY[c],
        "n_tracts": int(len(sub)),
        "pct_of_tracts": round(len(sub)/len(df)*100, 1),
        "pct_cooling_desert": round(float(cd_pct), 1),
        "mean_cdi": round(float(sub["CDI"].mean()), 1),
        "mean_hvi": round(float(sub["HVI_RANK"].mean()), 2),
        "mean_rent_burden": round(float(sub["pct_rent_burden_50_plus"].mean()), 1),
        "mean_income": round(float(sub["median_household_income"].mean()), 0),
        "mean_pct_black": round(float(sub["pct_black"].mean()), 1),
        "mean_lep": round(float(sub["pct_limited_english"].mean()), 1),
        "mean_disability": round(float(sub["pct_disability"].mean()), 1),
        "mean_overcrowding": round(float(sub["pct_overcrowded_renter"].mean()), 1),
        "top_boroughs": top_boroughs.to_dict(),
    })

# ── Statistical validation ─────────────────────────────────────
groups = [df[df["cluster"]==c]["CDI"].values for c in range(1, 6)]
h, p = stats.kruskal(*groups)
print(f"\nKruskal-Wallis CDI across clusters: H={h:.1f}, p={p:.2e}")

# ── Write labels to GeoJSON ────────────────────────────────────
for path in [DATA, WEB]:
    g = gpd.read_file(path)
    for col in ["cluster", "cluster_name"]:
        if col in g.columns:
            g = g.drop(columns=[col])
    g = g.merge(df[["GEOID","cluster","cluster_name"]], on="GEOID", how="left")
    g.to_file(path, driver="GeoJSON")
    print(f"Updated → {path}")

# ── Save results ───────────────────────────────────────────────
results = {
    "k": 5,
    "kruskal_wallis": {"H": round(float(h), 1), "p": float(p)},
    "cluster_profiles": profile_rows,
}
with open(f"{OUT}/cluster_results.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"Results saved → {OUT}/cluster_results.json")
print("\n✓ Clustering complete. Proceed to Phase 6: Spatial Autocorrelation.")
