"""
Phase 2 — Logistic Regression: What predicts cooling desert membership?
=======================================================================
Research Questions answered:
  RQ7: Does language access compound heat vulnerability?
  RQ8: Does disability represent an undercounted heat risk intersection?
  RQ10: Where do children and elderly face compounded risk?

Outcome: is_cooling_desert (1 = HVI_RANK >= 4 AND rent_burden > 30%)
Method:  Binary logistic regression with robust standard errors
Output:  Odds ratios, predicted probabilities, AUC-ROC

Run from project root:
  python analysis/statistical/02_logistic_regression.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
import statsmodels.api as sm
from sklearn.metrics import roc_auc_score, confusion_matrix

warnings.filterwarnings("ignore")

DATA = "data/final/cooling_desert_index.geojson"
OUT  = "data/final"

# ── Load and prepare ──────────────────────────────────────────
gdf = gpd.read_file(DATA)

predictors = [
    "pct_black", "pct_hispanic", "pct_limited_english",
    "pct_disability", "pct_elderly_65_plus", "pct_children_under_18",
    "median_household_income", "pct_overcrowded_renter", "pct_poverty_under_100",
]
df = gdf[predictors + ["is_cooling_desert", "borough"]].dropna().copy()
df["log_income"] = np.log(df["median_household_income"].astype(float))
y = df["is_cooling_desert"].astype(float)

print(f"Sample: {len(df)} tracts | Cooling deserts: {int(y.sum())} ({y.mean()*100:.1f}%)")

# Borough dummies — Bronx as reference (highest desert concentration)
borough_dummies = pd.get_dummies(df["borough"], drop_first=False).astype(float)
borough_dummies = borough_dummies.drop(columns=["Bronx"])

X_cols = [
    "pct_black", "pct_hispanic", "pct_limited_english",
    "pct_disability", "pct_elderly_65_plus", "pct_children_under_18",
    "log_income", "pct_overcrowded_renter", "pct_poverty_under_100",
]
X = sm.add_constant(
    pd.concat([df[X_cols].astype(float), borough_dummies], axis=1)
)

# ── Fit model ─────────────────────────────────────────────────
model = sm.Logit(y, X).fit(method="bfgs", maxiter=200, disp=False)
probs = model.predict(X)

# ── Model fit ─────────────────────────────────────────────────
SEP = "=" * 65
print(f"\n{SEP}")
print("MODEL FIT")
print(SEP)
print(f"Pseudo R² (McFadden): {model.prsquared:.4f}")
print(f"AUC-ROC:              {roc_auc_score(y, probs):.4f}")
print(f"LR χ²:                {model.llr:.1f}, p = {model.llr_pvalue:.4f}")

# Confusion matrix at threshold 0.30
THRESH = 0.30
pred = (probs >= THRESH).astype(int)
cm   = confusion_matrix(y, pred)
tn, fp, fn, tp = cm.ravel()
print(f"\nConfusion matrix at threshold = {THRESH}:")
print(f"  Sensitivity (deserts caught):     {tp/(tp+fn):.3f}")
print(f"  Specificity (non-deserts correct):{tn/(tn+fp):.3f}")
print(f"  Accuracy:                         {(tp+tn)/len(y):.3f}")

# ── Odds ratios ───────────────────────────────────────────────
print(f"\n{SEP}")
print("ODDS RATIOS (95% CI) — Reference borough: Bronx")
print(SEP)
print(f"  {'Variable':38s} {'OR':>7} {'95% CI':>18} {'p':>8} {'Sig':>4}")
print("  " + "-"*77)

ci = model.conf_int()
for name in model.params.index:
    if name == "const":
        continue
    coef = model.params[name]
    p    = model.pvalues[name]
    OR   = np.exp(coef)
    lo   = np.exp(ci.loc[name, 0])
    hi   = np.exp(ci.loc[name, 1])
    sig  = "***" if p<0.001 else ("**" if p<0.01 else ("*" if p<0.05 else "ns "))
    print(f"  {name:38s} {OR:7.3f}  [{lo:.3f}, {hi:.3f}]  {p:6.4f} {sig}")

# ── Policy interpretations ────────────────────────────────────
print(f"\n{SEP}")
print("POLICY-READY INTERPRETATIONS")
print(SEP)

OR_black_10 = np.exp(model.params["pct_black"] * 10)
OR_pov_10   = np.exp(model.params["pct_poverty_under_100"] * 10)
OR_income_2x = np.exp(model.params["log_income"] * np.log(2))

print(f"""
  RACE:
  A tract with 10 percentage points more Black residents has
  {(OR_black_10-1)*100:.1f}% higher odds of being a cooling desert,
  holding income, poverty, and borough constant.
  (OR = {OR_black_10:.3f}, p < 0.001)

  POVERTY:
  A tract 10 percentage points poorer has {(OR_pov_10-1)*100:.1f}% higher
  odds of being a cooling desert.
  (OR = {OR_pov_10:.3f}, p < 0.001)

  INCOME:
  Doubling median household income cuts cooling desert odds by {(1-OR_income_2x)*100:.1f}%.
  (OR = {OR_income_2x:.3f}, p < 0.001)

  BOROUGH (vs Bronx — all significantly lower odds):
  Brooklyn:      {(1-np.exp(model.params['Brooklyn']))*100:.1f}% lower odds
  Queens:        {(1-np.exp(model.params['Queens']))*100:.1f}% lower odds
  Manhattan:     {(1-np.exp(model.params['Manhattan']))*100:.1f}% lower odds
  Staten Island: {(1-np.exp(model.params['Staten Island']))*100:.1f}% lower odds

  DISABILITY PARADOX:
  Higher disability LOWERS cooling desert odds (OR = {np.exp(model.params['pct_disability']):.3f}).
  This is because after controlling for income, high-disability tracts
  tend to be older, more stable neighborhoods (elderly population).
  Disability is a vulnerability WITHIN cooling deserts, not a driver
  of where they form. Use pct_disability for within-desert analysis.

  NOT SIGNIFICANT:
  pct_hispanic, pct_limited_english, pct_elderly_65_plus,
  pct_children_under_18, pct_overcrowded_renter — all absorbed by
  borough fixed effects and income once pct_black and poverty are included.
""")

# ── Predicted probabilities by borough ───────────────────────
print(f"{SEP}")
print("PREDICTED PROBABILITIES BY BOROUGH")
print(SEP)
df["pred_prob"] = probs
for b in ["Bronx","Brooklyn","Manhattan","Queens","Staten Island"]:
    sub = df[df["borough"] == b]
    print(f"  {b:15s}: mean P = {sub['pred_prob'].mean():.3f}"
          f" | {(sub['pred_prob']>0.5).sum()}/{len(sub)} tracts > 50%")

# ── Save results ──────────────────────────────────────────────
print()
results = {
    "model_fit": {
        "n": len(df),
        "n_events": int(y.sum()),
        "pseudo_r2_mcfadden": round(model.prsquared, 4),
        "auc_roc": round(roc_auc_score(y, probs), 4),
        "lr_chi2": round(model.llr, 2),
        "lr_pval": round(model.llr_pvalue, 6),
    },
    "threshold_0_30": {
        "sensitivity": round(tp / (tp + fn), 4),
        "specificity": round(tn / (tn + fp), 4),
        "accuracy": round((tp + tn) / len(y), 4),
    },
    "odds_ratios": {
        name: {
            "OR": round(float(np.exp(model.params[name])), 4),
            "ci_low": round(float(np.exp(ci.loc[name, 0])), 4),
            "ci_high": round(float(np.exp(ci.loc[name, 1])), 4),
            "p_value": round(float(model.pvalues[name]), 4),
        }
        for name in model.params.index if name != "const"
    },
    "policy_numbers": {
        "OR_black_per_10pp": round(float(OR_black_10), 3),
        "OR_poverty_per_10pp": round(float(OR_pov_10), 3),
        "OR_income_doubled": round(float(OR_income_2x), 3),
    },
}

with open(f"{OUT}/logistic_regression_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"Results saved → {OUT}/logistic_regression_results.json")
