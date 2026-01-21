// Eligibility checking service for RPC Lending
// Validates state licensing, geography, LTV, credit limits before quote generation

// Top 200 MSAs (simplified - in production, use full list)
const TOP_200_MSAs = [
  'New York', 'Los Angeles', 'Chicago', 'Dallas', 'Houston', 'Washington', 'Miami', 'Philadelphia',
  'Atlanta', 'Phoenix', 'Boston', 'San Francisco', 'Riverside', 'Detroit', 'Seattle', 'Minneapolis',
  'San Diego', 'Tampa', 'Denver', 'St. Louis', 'Baltimore', 'Charlotte', 'Orlando', 'San Antonio',
  'Portland', 'Sacramento', 'Pittsburgh', 'Las Vegas', 'Austin', 'Cincinnati', 'Kansas City',
  'Columbus', 'Indianapolis', 'Cleveland', 'San Jose', 'Nashville', 'Virginia Beach', 'Providence',
  'Milwaukee', 'Jacksonville', 'Memphis', 'Oklahoma City', 'Louisville', 'Hartford', 'Richmond',
  'New Orleans', 'Buffalo', 'Raleigh', 'Birmingham', 'Salt Lake City', 'Rochester', 'Grand Rapids',
  'Tucson', 'Tulsa', 'Honolulu', 'Omaha', 'El Paso', 'McAllen', 'Albany', 'Baton Rouge',
  'Allentown', 'Albuquerque', 'Bakersfield', 'Bridgeport', 'Cape Coral', 'Charleston', 'Colorado Springs',
  'Columbia', 'Dayton', 'Des Moines', 'Durham', 'Fresno', 'Grand Rapids', 'Greensboro', 'Greenville',
  'Harrisburg', 'Jackson', 'Knoxville', 'Lakeland', 'Little Rock', 'Madison', 'North Port', 'Ogden',
  'Oxnard', 'Palm Bay', 'Pensacola', 'Portland', 'Provo', 'Reno', 'Rochester', 'Scranton', 'Spokane',
  'Springfield', 'Stockton', 'Syracuse', 'Toledo', 'Tucson', 'Urban Honolulu', 'Wichita', 'Worcester',
  'Youngstown', 'Akron', 'Albuquerque', 'Anchorage', 'Ann Arbor', 'Asheville', 'Augusta', 'Bakersfield',
  'Baton Rouge', 'Beaumont', 'Bellingham', 'Bend', 'Billings', 'Binghamton', 'Boise', 'Boulder',
  'Bremerton', 'Brownsville', 'Burlington', 'Canton', 'Cape Coral', 'Cedar Rapids', 'Champaign', 'Charleston',
  'Chattanooga', 'Chico', 'Cincinnati', 'Clarksville', 'Cleveland', 'Colorado Springs', 'Columbia', 'Columbus',
  'Corpus Christi', 'Dallas', 'Davenport', 'Dayton', 'Deltona', 'Denver', 'Des Moines', 'Detroit',
  'Duluth', 'Durham', 'El Centro', 'El Paso', 'Eugene', 'Evansville', 'Fargo', 'Fayetteville',
  'Flint', 'Fort Collins', 'Fort Myers', 'Fort Wayne', 'Fresno', 'Gainesville', 'Grand Rapids', 'Greensboro',
  'Greenville', 'Gulfport', 'Hagerstown', 'Harrisburg', 'Hartford', 'Hickory', 'Honolulu', 'Houston',
  'Huntsville', 'Idaho Falls', 'Indianapolis', 'Iowa City', 'Jackson', 'Jacksonville', 'Johnson City',
  'Johnstown', 'Joplin', 'Kalamazoo', 'Kansas City', 'Kennewick', 'Killeen', 'Kingsport', 'Knoxville',
  'Lafayette', 'Lakeland', 'Lancaster', 'Lansing', 'Laredo', 'Las Vegas', 'Lawton', 'Lexington',
  'Lincoln', 'Little Rock', 'Logan', 'Longview', 'Los Angeles', 'Louisville', 'Lubbock', 'Lynchburg',
  'Macon', 'Madison', 'Manchester', 'McAllen', 'Medford', 'Memphis', 'Miami', 'Milwaukee',
  'Minneapolis', 'Mobile', 'Modesto', 'Montgomery', 'Myrtle Beach', 'Naples', 'Nashville', 'New Haven',
  'New Orleans', 'New York', 'North Port', 'Norwich', 'Ocala', 'Ogden', 'Oklahoma City', 'Olympia',
  'Omaha', 'Orlando', 'Oxnard', 'Palm Bay', 'Pensacola', 'Peoria', 'Philadelphia', 'Phoenix',
  'Pittsburgh', 'Portland', 'Port St. Lucie', 'Prescott', 'Provo', 'Pueblo', 'Punta Gorda', 'Raleigh',
  'Rapid City', 'Reading', 'Reno', 'Richmond', 'Riverside', 'Roanoke', 'Rochester', 'Rockford',
  'Sacramento', 'Saginaw', 'Salem', 'Salinas', 'Salt Lake City', 'San Antonio', 'San Diego', 'San Francisco',
  'San Jose', 'San Luis Obispo', 'Santa Barbara', 'Santa Fe', 'Santa Rosa', 'Sarasota', 'Savannah', 'Scranton',
  'Seattle', 'Shreveport', 'Sioux Falls', 'South Bend', 'Spartanburg', 'Spokane', 'Springfield', 'St. Louis',
  'Stockton', 'Syracuse', 'Tallahassee', 'Tampa', 'Toledo', 'Topeka', 'Trenton', 'Tucson',
  'Tulsa', 'Tuscaloosa', 'Tyler', 'Urban Honolulu', 'Utica', 'Valdosta', 'Vallejo', 'Vero Beach',
  'Virginia Beach', 'Visalia', 'Waco', 'Warner Robins', 'Washington', 'Waterloo', 'Wichita', 'Wilmington',
  'Winston-Salem', 'Worcester', 'Yakima', 'York', 'Youngstown', 'Yuma'
];

// States where RPC is licensed (example - update with actual licensing)
const LICENSED_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// LTV limits by product type
const LTV_LIMITS = {
  dscr_rental: 80,
  portfolio_refinance: 75,
  fix_flip: 90,
  ground_up: 75,
  heloc: 90,
  multifamily_bridge: 80,
  commercial: 75,
  default: 75
};

// Credit score minimums
const CREDIT_MINIMUMS = {
  heloc: 700,
  default: 640
};

/**
 * Check if property is in eligible geography (Top 200 MSAs)
 */
const checkGeography = (city, state) => {
  // In production, use geocoding API to determine MSA
  // For now, check if city is in our list
  if (!city) return false;
  const cityLower = city.toLowerCase().trim();
  // Also check for partial matches (e.g., "Los Angeles" matches "Los Angeles, CA")
  return TOP_200_MSAs.some(msa => {
    const msaLower = msa.toLowerCase();
    return msaLower === cityLower || cityLower.includes(msaLower) || msaLower.includes(cityLower);
  });
};

/**
 * Check if state is licensed
 */
const checkStateLicensing = (state) => {
  return LICENSED_STATES.includes(state.toUpperCase());
};

/**
 * Check LTV limits
 */
const checkLTVLimit = (transactionType, requestedLTV) => {
  const maxLTV = LTV_LIMITS[transactionType] || LTV_LIMITS.default;
  return requestedLTV <= maxLTV;
};

/**
 * Check credit score minimum
 */
const checkCreditMinimum = (transactionType, creditScore) => {
  if (!creditScore) return { eligible: true, reason: null }; // Credit not pulled yet
  
  const minimum = CREDIT_MINIMUMS[transactionType] || CREDIT_MINIMUMS.default;
  return {
    eligible: creditScore >= minimum,
    reason: creditScore < minimum ? `Credit score ${creditScore} below minimum ${minimum}` : null
  };
};

/**
 * Comprehensive eligibility check
 */
const checkEligibility = (loan) => {
  const errors = [];
  
  // Skip eligibility checks in development mode if DISABLE_ELIGIBILITY_CHECKS is set
  if (process.env.DISABLE_ELIGIBILITY_CHECKS === 'true' || process.env.NODE_ENV === 'development') {
    // Still log what would have been checked
    console.log('[Eligibility] Checks disabled in development mode');
    return {
      eligible: true,
      errors: []
    };
  }

  // Check state licensing
  if (!checkStateLicensing(loan.property_state)) {
    errors.push({
      field: 'property_state',
      message: `RPC is not licensed to originate loans in ${loan.property_state}. Please contact us for assistance.`
    });
  }

  // Check geography (Top 200 MSAs) - only if city is provided
  if (loan.property_city && !checkGeography(loan.property_city, loan.property_state)) {
    errors.push({
      field: 'property_city',
      message: `Property location (${loan.property_city}, ${loan.property_state}) is not in an eligible MSA. RPC currently serves properties in Top 200 U.S. Metropolitan Statistical Areas.`
    });
  }

  // Check LTV limits
  if (loan.requested_ltv && loan.transaction_type) {
    if (!checkLTVLimit(loan.transaction_type, loan.requested_ltv)) {
      const maxLTV = LTV_LIMITS[loan.transaction_type] || LTV_LIMITS.default;
      errors.push({
        field: 'requested_ltv',
        message: `Requested LTV ${loan.requested_ltv}% exceeds maximum ${maxLTV}% for ${loan.transaction_type} loans.`
      });
    }
  }

  // Check credit score (if available)
  if (loan.fico_score) {
    const creditCheck = checkCreditMinimum(loan.transaction_type, loan.fico_score);
    if (!creditCheck.eligible) {
      errors.push({
        field: 'credit_score',
        message: creditCheck.reason
      });
    }
  }

  return {
    eligible: errors.length === 0,
    errors
  };
};

module.exports = {
  checkEligibility,
  checkGeography,
  checkStateLicensing,
  checkLTVLimit,
  checkCreditMinimum,
  LTV_LIMITS,
  CREDIT_MINIMUMS,
  LICENSED_STATES
};

