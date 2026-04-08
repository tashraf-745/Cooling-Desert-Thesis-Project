// Map context panel: updates descriptive text based on selected layer, borough, and overlays

(function () {
  'use strict';

  // ── Layer descriptions ────────────────────────────────────────────
  const LAYER_TEXT = {
    cdi: {
      all:           'The Cooling Desert Index ranges from 2.9 to 72.0 across New York City\'s 2,231 neighborhoods. It combines seven variables into a single composite score: heat danger level, severe rent burden, median income, share of Black residents, limited English proficiency, disability, and overcrowded renter housing. The citywide mean is 39.4. Neighborhoods scoring above 45 are classified as cooling deserts.',
      Bronx:         'In the Bronx, the mean Cooling Desert Index score is 52.1, well above the citywide average of 39.4. This gap reflects the concentrated weight of high heat danger, severe rent burden, and decades of disinvestment that have accumulated in the borough. More than half of the Bronx\'s neighborhoods score above the cooling desert threshold.',
      Brooklyn:      'Brooklyn spans a wide range of scores on the Cooling Desert Index. Neighborhoods in Brownsville, East New York, and Bushwick cluster at the high end of the scale, while northern and coastal Brooklyn score considerably lower. That internal variation makes Brooklyn a borough where targeted intervention, rather than broad policy, is most likely to be effective.',
      Manhattan:     'Manhattan\'s Cooling Desert Index scores are sharply polarized. Upper Manhattan, particularly East Harlem and Washington Heights, carries the highest scores in the borough. These neighborhoods combine elevated heat danger with severe rent burden and a strong racial heat exposure effect. Lower Manhattan and the Upper West Side score among the lowest in the city.',
      Queens:        'In Queens, cooling desert risk is concentrated in the western and central neighborhoods closest to the urban core: Jackson Heights, Elmhurst, South Jamaica, and Ozone Park. These areas combine moderate-to-high heat danger with high rent burden, language barriers, and dense, aging housing stock. Eastern Queens scores considerably lower.',
      'Staten Island': 'Staten Island has the lowest Cooling Desert Index scores of the five boroughs, with the vast majority of its neighborhoods well below the cooling desert threshold. Lower residential density, more extensive tree cover, and higher household incomes contribute to a lower overall risk profile across most of the borough.'
    },

    binary: {
      all:           '557 neighborhoods in New York City meet the criteria for a cooling desert: a Heat Vulnerability Index of 4 or 5 combined with structural constraints that limit the capacity to cool. These neighborhoods are home to approximately 1.47 million renters, representing about 25% of the city\'s total land area. The remaining 1,674 neighborhoods, shown in lighter tones, fall below the cooling desert threshold.',
      Bronx:         'The Bronx has the highest share of cooling deserts in the city: 53.8% of its neighborhoods are classified as at risk. No other borough comes close to that concentration. The Bronx\'s cooling desert geography is not scattered but continuous, with high-risk neighborhoods clustering in unbroken zones across the South and Central Bronx.',
      Brooklyn:      'Brooklyn accounts for a significant share of the city\'s total cooling deserts in absolute numbers. 28.7% of its neighborhoods are classified as at risk. The cooling desert geography of Brooklyn is concentrated in the southeastern and central parts of the borough, with a clear spatial boundary separating high-risk and lower-risk areas.',
      Manhattan:     'In Manhattan, cooling deserts are concentrated almost entirely above 96th Street, in the neighborhoods of East Harlem, West Harlem, Washington Heights, and Inwood. South of that line, the borough\'s higher incomes, better housing quality, and greater green space push most neighborhoods below the cooling desert threshold.',
      Queens:        'Queens has 16.3% of its neighborhoods classified as cooling deserts. The geographic pattern is distinct: risk concentrates in the western and central parts of the borough, particularly in neighborhoods with dense multifamily housing, high rent burden, and large immigrant populations with limited English proficiency.',
      'Staten Island': 'Fewer than 5% of Staten Island\'s neighborhoods are classified as cooling deserts. The borough has the lowest absolute count of cooling deserts in the city. Most at-risk neighborhoods are concentrated in the North Shore communities near St. George and New Brighton, which share the housing density and income constraints more common in the other boroughs.'
    },

    lisa: {
      all:           'Spatial autocorrelation reveals that cooling desert risk is not randomly distributed across New York City. The Global Moran\'s I for the Cooling Desert Index is 0.867, meaning neighborhoods at high risk are almost always surrounded by other high-risk neighborhoods. 582 neighborhoods form statistically significant high-risk clusters. 516 neighborhoods form low-risk clusters. The remaining neighborhoods fall into intermediate or isolated categories.',
      Bronx:         'The Bronx is the most spatially concentrated cooling desert zone in the city. 66% of its high-risk neighborhoods are completely surrounded by other high-risk neighborhoods, forming a near-continuous zone of compounded heat danger across the South and Central Bronx. This geographic lock-in means residents cannot escape risk simply by walking to the next street or block.',
      Brooklyn:      'Brooklyn has the second-largest high-risk cluster in the city by neighborhood count, concentrated in Brownsville, East New York, and Canarsie. The cluster structure in Brooklyn is somewhat less continuous than in the Bronx, with isolated lower-risk neighborhoods breaking the high-risk zones in some areas of East Brooklyn.',
      Manhattan:     'Upper Manhattan forms a compact but significant high-risk cluster. East Harlem, Central Harlem, and Washington Heights are embedded in a contiguous zone of elevated risk, with few lower-risk neighborhoods breaking the pattern until the transition to Midtown. The spatial concentration here reinforces the income and racial polarization visible in other layers.',
      Queens:        'In Queens, the spatial clustering pattern is less extreme than in the Bronx but still meaningful. A concentrated high-risk cluster extends through western and central Queens. The eastern portions of the borough fall into clear low-risk clusters, creating a sharp spatial gradient that reflects Queens\'s significant internal income and housing diversity.',
      'Staten Island': 'Staten Island has a predominantly low-risk spatial cluster structure. Most of the borough falls into a statistically significant low-risk cluster, with high-risk neighborhoods appearing only as isolated pockets on the North Shore. The spatial pattern here is the inverse of the Bronx: neighborhoods at risk are surrounded by lower-risk neighbors.'
    },

    cluster: {
      all:           'Five structural profiles emerge from clustering New York City\'s neighborhoods by their risk variables. Low Risk neighborhoods (Cluster 1) face minimal barriers to cooling. Financially Strained neighborhoods (Cluster 2) are defined primarily by rent burden and low income. Racial Heat Burden neighborhoods (Cluster 3) experience elevated temperatures tied to racial composition and disinvestment. Immigrant Heat Burden neighborhoods (Cluster 4) are shaped by language barriers and overcrowding. Compound Deprivation neighborhoods (Cluster 5) face all of these pressures simultaneously and represent the most structurally entrenched cooling deserts in the city.',
      Bronx:         'The Bronx is disproportionately composed of Compound Deprivation and Racial Heat Burden neighborhoods. These are the cluster types facing the most intersecting pressures: high heat danger combined with severe financial constraint, racial disinvestment, and in many cases significant language barriers as well. Single-intervention policy is unlikely to be sufficient for these neighborhoods.',
      Brooklyn:      'Brooklyn shows the widest mix of cluster types among the five boroughs. High-risk cluster types concentrate in the southeast, while Financially Strained and Immigrant Heat Burden profiles appear across central Brooklyn. Lower-risk cluster types dominate the northern and coastal areas. This diversity means Brooklyn requires the most geographically targeted policy approach.',
      Manhattan:     'In Manhattan, the cluster geography follows a clear north-south divide. Upper Manhattan is dominated by Racial Heat Burden and Compound Deprivation cluster types. Below 96th Street, neighborhoods shift sharply to Low Risk classifications. The concentration of the highest-risk cluster types in a single, geographically defined part of the borough reflects the long history of racial and economic stratification in Manhattan\'s housing market.',
      Queens:        'Queens has a significant concentration of Immigrant Heat Burden neighborhoods in its western and central sections, reflecting the borough\'s large and linguistically diverse immigrant population. These neighborhoods face a specific combination of heat danger and language-access barriers that requires culturally competent outreach and multilingual emergency communications as a priority intervention.',
      'Staten Island': 'Staten Island is composed almost entirely of Low Risk neighborhoods on the cluster typology. The Financially Strained and Racial Heat Burden cluster types that dominate the Bronx and parts of Brooklyn are largely absent here. The North Shore represents the exception, with a small concentration of higher-risk cluster types in its densest and lowest-income communities.'
    },

    hvi: {
      all:           'The Heat Vulnerability Index (HVI), produced by the NYC Department of Health and Mental Hygiene, rates every neighborhood on a 1-to-5 scale. It combines surface temperature, green space cover, air conditioning prevalence, and poverty. A rating of 4 or 5 signals the highest heat danger and is the primary exposure criterion for cooling desert classification. HVI scores of 4 and 5 are concentrated in the Bronx, upper Manhattan, central Brooklyn, and western Queens.',
      Bronx:         'The Bronx has the highest concentration of HVI 4 and 5 neighborhoods in New York City. The combination of lower tree canopy cover, older building stock that absorbs and retains heat, high poverty rates, and lower air conditioning prevalence produces surface temperatures and heat danger levels that consistently exceed citywide averages.',
      Brooklyn:      'In Brooklyn, HVI 4 and 5 neighborhoods cluster in the central and southeastern parts of the borough. Brownsville and East New York consistently record some of the highest heat danger ratings in the city, driven by low tree cover, high building density, and poverty levels that reduce household adaptive capacity.',
      Manhattan:     'East Harlem carries the highest HVI scores in Manhattan, reaching 5 in its densest sections. The contrast with Midtown and the Upper East Side, which score 1 and 2, is among the sharpest geographic gradients in the entire city. The HVI pattern in Manhattan follows neighborhood racial and income lines with a precision that reflects structural, not natural, causes.',
      Queens:        'In Queens, HVI 4 and 5 ratings are concentrated in the western neighborhoods of the borough, where building density, lower tree cover, and poverty combine to elevate heat danger. Eastern Queens neighborhoods generally score 1 and 2, reflecting lower density and more green space.',
      'Staten Island': 'Staten Island records the lowest HVI scores of any borough. The majority of its neighborhoods rate 1 or 2, reflecting lower density, more extensive vegetation, and higher household incomes. The North Shore, with its older housing stock and lower incomes, carries the highest HVI scores on the island.'
    },

    temp: {
      all:           'Average summer surface temperatures across New York City reflect the urban heat island effect shaped by tree cover, impervious surfaces, and building density. The hottest neighborhoods are dense, with little green space and aging building stock. These physical conditions correlate strongly with cooling desert classification: the neighborhoods running hottest in summer are, in most cases, the same neighborhoods least equipped to keep their residents cool indoors.',
      Bronx:         'The Bronx records some of the highest average summer surface temperatures in New York City. Low tree canopy coverage across much of the South and Central Bronx, combined with high building density and large areas of impervious surface, creates an urban heat island effect that elevates temperatures well above regional averages on hot days.',
      Brooklyn:      'Average summer temperatures in Brooklyn show a pronounced spatial gradient. Brownsville and East New York, with their low tree cover and high density, are among the hottest neighborhoods in the borough. Coastal neighborhoods and those with more parkland and tree canopy are measurably cooler, a difference that directly affects indoor comfort and heat-related mortality risk.',
      Manhattan:     'Surface temperatures in Manhattan reflect the borough\'s density and the uneven distribution of green space. Upper Manhattan and East Harlem record higher average temperatures than Central Park-adjacent neighborhoods or the Upper East Side. The relationship between temperature and race is strongest in Manhattan: after controlling for income, a 1% increase in Black residents is associated with a 5.27-degree Fahrenheit increase in surface temperature.',
      Queens:        'Queens shows a clear east-west temperature gradient. Western Queens, with its higher density and less green space, records higher average summer temperatures. Eastern Queens, with more single-family housing, lower density, and greater tree cover, is significantly cooler. That temperature difference translates directly into differences in heat danger and cooling desert risk.',
      'Staten Island': 'Staten Island records the lowest average summer surface temperatures of the five boroughs. The island\'s lower residential density, more extensive tree canopy, and greater proportion of single-family housing with yards significantly reduces the urban heat island effect compared to the denser boroughs. This physical difference is a major contributor to the borough\'s lower overall heat risk profile.'
    }
  };

  // ── Overlay additions ─────────────────────────────────────────────
  const OVERLAY_TEXT = {
    coolit: ' Public outdoor cooling features, including spray showers, misting stations, and fountains, are unevenly distributed across the city. Many neighborhoods with the highest heat risk scores have no outdoor cooling feature within reasonable walking distance, meaning the city\'s public cooling infrastructure does not reach the communities most exposed to heat danger.',
    nycha:  ' NYCHA public housing developments are concentrated in neighborhoods with Heat Vulnerability Index scores of 4 or 5. One in three NYCHA residents cites the monthly AC surcharge as a barrier to using air conditioning. Approximately 21% of older NYCHA residents lack a working AC unit entirely.'
  };

  // ── State ─────────────────────────────────────────────────────────
  let currentLayer   = 'cdi';
  let currentBorough = 'all';

  function updateContextPanel() {
    const layerTexts = LAYER_TEXT[currentLayer];
    if (!layerTexts) return;

    const borough = currentBorough === 'all' ? 'all' : currentBorough;
    let text = layerTexts[borough] || layerTexts['all'];

    // Append overlay context
    const coolitChecked = document.getElementById('overlay-coolit');
    const nychaChecked  = document.getElementById('overlay-nycha');
    if (coolitChecked && coolitChecked.checked) text += OVERLAY_TEXT.coolit;
    if (nychaChecked  && nychaChecked.checked)  text += OVERLAY_TEXT.nycha;

    const el = document.getElementById('map-context-text');
    if (el) el.textContent = text;
  }

  // ── Event listeners ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Layer radio buttons
    document.querySelectorAll('input[name="map-layer"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        currentLayer = this.value;
        updateContextPanel();
      });
    });

    // Borough buttons
    document.querySelectorAll('.borough-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val = this.dataset.borough;
        currentBorough = (val === 'all') ? 'all' : val;
        updateContextPanel();
      });
    });

    // Overlay checkboxes
    const coolitCb = document.getElementById('overlay-coolit');
    const nychaCb  = document.getElementById('overlay-nycha');
    if (coolitCb) coolitCb.addEventListener('change', updateContextPanel);
    if (nychaCb)  nychaCb.addEventListener('change', updateContextPanel);

    // Set initial text
    updateContextPanel();
  });

}());
