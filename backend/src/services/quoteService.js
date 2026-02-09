// Soft quote generation service for RPC Lending
// Implements DSCR-based pricing with credit score adjustments

const LOAN_PRODUCTS = {
  DSCR_RENTAL: 'dscr_rental',
  FIX_FLIP: 'fix_flip',
  GROUND_UP: 'ground_up',
  HELOC: 'heloc',
  MULTIFAMILY_BRIDGE: 'multifamily_bridge',
  MULTIFAMILY_VALUE_ADD: 'multifamily_value_add',
  MULTIFAMILY_CASH_OUT: 'multifamily_cash_out',
  COMMERCIAL: 'commercial'
};

// Calculate DSCR ratio
const calculateDSCR = (annualRentalIncome, annualOperatingExpenses, annualLoanPayments) => {
  if (!annualLoanPayments || annualLoanPayments <= 0) return null;
  const noi = annualRentalIncome - annualOperatingExpenses;
  return noi / annualLoanPayments;
};

// Check if loan should be auto-declined based on DSCR
const shouldAutoDecline = (loan) => {
  // Skip DSCR check for light doc, bank statement, or no doc loans
  const exemptDocTypes = ['light_doc', 'bank_statement', 'no_doc'];
  if (exemptDocTypes.includes(loan.documentation_type)) {
    return { declined: false, reason: null };
  }

  if (loan.dscr_ratio && loan.dscr_ratio < 1.0) {
    return { 
      declined: true, 
      reason: 'DSCR ratio below 1.0x minimum requirement' 
    };
  }

  return { declined: false, reason: null };
};

// Generate soft quote with rate range based on credit score and DSCR
const generateSoftQuote = (loan, creditScore = null) => {
  const loanAmount = parseFloat(loan.loan_amount) || 0;
  const ltv = parseFloat(loan.requested_ltv) || 75;
  const propertyValue = parseFloat(loan.property_value) || 0;
  const dscr = parseFloat(loan.dscr_ratio) || 1.15;

  // Check for auto-decline
  const declineCheck = shouldAutoDecline(loan);
  if (declineCheck.declined) {
    return {
      approved: false,
      declineReason: declineCheck.reason,
      loanAmount,
      propertyValue,
      ltv,
      dscr
    };
  }

  // Base rate range for DSCR loans: 6.75% - 7.25%
  let baseRateMin = 6.75;
  let baseRateMax = 7.25;

  // Adjust for loan product type
  switch (loan.loan_product || loan.transaction_type) {
    case 'fix_flip':
    case 'purchase_fix_flip':
      baseRateMin = 9.5;
      baseRateMax = 11.5;
      break;
    case 'ground_up':
    case 'purchase_ground_up':
      baseRateMin = 10.0;
      baseRateMax = 12.0;
      break;
    case 'multifamily_bridge':
      baseRateMin = 7.5;
      baseRateMax = 9.0;
      break;
    case 'commercial':
      baseRateMin = 7.75;
      baseRateMax = 9.25;
      break;
  }

  // Credit score adjustments
  if (creditScore) {
    if (creditScore >= 760) {
      baseRateMin -= 0.25;
      baseRateMax -= 0.25;
    } else if (creditScore >= 720) {
      // No adjustment
    } else if (creditScore >= 680) {
      baseRateMin += 0.25;
      baseRateMax += 0.25;
    } else if (creditScore >= 640) {
      baseRateMin += 0.5;
      baseRateMax += 0.5;
    } else {
      baseRateMin += 1.0;
      baseRateMax += 1.0;
    }
  }

  // DSCR adjustments (for DSCR loans including portfolio refinance)
  if (dscr && loan.property_type === 'residential' && loan.borrower_type === 'investment') {
    // Portfolio refinance gets same pricing as DSCR rental
    const isDSCRLoan = ['dscr_rental', 'portfolio_refinance'].includes(loan.transaction_type);
    if (isDSCRLoan) {
      if (dscr >= 1.25) {
        baseRateMin -= 0.125;
        baseRateMax -= 0.125;
      } else if (dscr >= 1.15) {
        // No adjustment - standard pricing
      } else if (dscr >= 1.0) {
        baseRateMin += 0.25;
        baseRateMax += 0.25;
      }
    }
  }

  // LTV adjustments
  if (ltv > 80) baseRateMin += 0.25; baseRateMax += 0.25;
  if (ltv > 85) baseRateMin += 0.25; baseRateMax += 0.25;
  if (ltv > 90) baseRateMin += 0.5; baseRateMax += 0.5;

  // Documentation type adjustments
  if (loan.documentation_type === 'light_doc') {
    baseRateMin += 0.25;
    baseRateMax += 0.25;
  } else if (loan.documentation_type === 'bank_statement') {
    baseRateMin += 0.5;
    baseRateMax += 0.5;
  } else if (loan.documentation_type === 'no_doc') {
    baseRateMin += 0.75;
    baseRateMax += 0.75;
  }

  // Calculate points
  let originationPoints = 1.5;
  if (loanAmount > 1000000) originationPoints = 1.25;
  if (loanAmount > 2000000) originationPoints = 1.0;
  if (loanAmount > 5000000) originationPoints = 0.75;

  // Calculate fees
  const originationFee = loanAmount * (originationPoints / 100);
  const processingFee = 995;
  const underwritingFee = 1495;
  const appraisalFee = loan.property_type === 'commercial' ? 750 : 500;

  // Monthly payment estimate (interest only at midpoint rate)
  const midRate = (baseRateMin + baseRateMax) / 2;
  const monthlyRate = midRate / 100 / 12;
  const monthlyPayment = loanAmount * monthlyRate;

  // Term options based on product
  let terms = [];
  if (loan.transaction_type?.includes('fix_flip') || loan.transaction_type?.includes('ground_up')) {
    terms = [
      { months: 12, rateMin: baseRateMin, rateMax: baseRateMax },
      { months: 18, rateMin: baseRateMin + 0.25, rateMax: baseRateMax + 0.25 },
      { months: 24, rateMin: baseRateMin + 0.5, rateMax: baseRateMax + 0.5 }
    ];
  } else {
    terms = [
      { months: 360, rateMin: baseRateMin, rateMax: baseRateMax, label: '30-Year Fixed' },
      { months: 60, rateMin: baseRateMin - 0.25, rateMax: baseRateMax - 0.25, label: '5/1 ARM' }
    ];
  }

  return {
    approved: true,
    loanAmount,
    propertyValue,
    ltv,
    dscr,
    interestRateMin: Math.round(baseRateMin * 1000) / 1000,
    interestRateMax: Math.round(baseRateMax * 1000) / 1000,
    rateRange: `${baseRateMin.toFixed(2)}% - ${baseRateMax.toFixed(2)}%`,
    originationPoints,
    originationFee: Math.round(originationFee),
    processingFee,
    underwritingFee,
    appraisalFee,
    totalClosingCosts: Math.round(originationFee + processingFee + underwritingFee + appraisalFee),
    estimatedMonthlyPayment: Math.round(monthlyPayment),
    terms,
    creditScoreUsed: creditScore,
    pricingFactors: {
      creditScore: creditScore ? `${creditScore}` : 'Not provided',
      dscr: dscr ? `${dscr.toFixed(2)}x` : 'N/A',
      ltv: `${ltv}%`,
      documentationType: loan.documentation_type || 'full_doc'
    },
    disclaimer: 'This is a preliminary quote based on information provided. Final rate depends on credit score verification, DSCR confirmation (must be ≥1.15x for best pricing), and property appraisal. Rates shown are a range - your actual rate will be determined during underwriting.',
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
};

// Get initial needs list based on loan type
const getInitialNeedsList = (loan) => {
  const baseItems = [
    { type: 'Government ID', folder: 'identification', description: 'Valid government-issued photo ID (driver\'s license or passport)', required: true },
    { type: 'Entity Documents', folder: 'entity_docs', description: 'LLC/Corp documents, Operating Agreement, Articles of Organization', required: true },
    { type: 'Purchase Contract', folder: 'purchase_contract', description: 'Signed purchase agreement (if purchase transaction)', required: loan.request_type === 'purchase' }
  ];

  // Documentation type specific items
  if (loan.documentation_type === 'full_doc') {
    baseItems.push(
      { type: 'Tax Returns', folder: 'tax_returns', description: 'Last 2 years personal and business tax returns with all schedules', required: true },
      { type: 'W-2s', folder: 'income_docs', description: 'Last 2 years W-2 forms', required: true },
      { type: 'Pay Stubs', folder: 'income_docs', description: 'Last 30 days pay stubs', required: true },
      { type: 'Bank Statements', folder: 'bank_statements', description: 'Last 2 months bank statements for all accounts', required: true }
    );
  } else if (loan.documentation_type === 'light_doc') {
    baseItems.push(
      { type: 'Bank Statements', folder: 'bank_statements', description: 'Last 2 months bank statements', required: true },
      { type: 'CPA Letter', folder: 'income_docs', description: 'CPA letter confirming income or asset documentation', required: true }
    );
  } else if (loan.documentation_type === 'bank_statement') {
    baseItems.push(
      { type: 'Bank Statements', folder: 'bank_statements', description: '12-24 months personal or business bank statements', required: true },
      { type: 'P&L Statement', folder: 'income_docs', description: 'Year-to-date Profit & Loss statement (if self-employed)', required: false }
    );
  }

  // DSCR/Investment property items
  if (loan.borrower_type === 'investment') {
    baseItems.push(
      { type: 'Lease Agreements', folder: 'property_docs', description: 'Current lease agreements for all units', required: true },
      { type: 'Rent Roll', folder: 'property_docs', description: 'Current rent roll showing all tenants and rents', required: true }
    );
  }

  // Commercial property items
  if (loan.property_type === 'commercial') {
    baseItems.push(
      { type: 'Operating Statement', folder: 'property_docs', description: 'Last 12 months operating statement (T-12)', required: true },
      { type: 'Rent Roll', folder: 'property_docs', description: 'Current rent roll with lease expiration dates', required: true },
      { type: 'Property Photos', folder: 'property_photos', description: 'Interior and exterior photos of the property', required: true }
    );
  }

  // Portfolio items (for portfolio refinance or portfolio purchase)
  if (loan.is_portfolio || loan.transaction_type === 'portfolio_refinance') {
    baseItems.push(
      { type: 'Portfolio Schedule', folder: 'portfolio_docs', description: `Schedule of all ${loan.portfolio_count || 'properties'} with addresses, values, and rents`, required: true },
      { type: 'Individual Property Docs', folder: 'portfolio_docs', description: 'Lease agreements and rent rolls for each property in the portfolio', required: true },
      { type: 'Portfolio DSCR Calculation', folder: 'portfolio_docs', description: 'Combined NOI and debt service for all properties in portfolio', required: true }
    );
  }

  // Fix & Flip / Construction items
  if (loan.transaction_type?.includes('fix_flip') || loan.transaction_type?.includes('ground_up')) {
    baseItems.push(
      { type: 'Scope of Work', folder: 'construction_docs', description: 'Detailed scope of work with line-item budget', required: true },
      { type: 'Contractor Bids', folder: 'construction_docs', description: 'Licensed contractor bids for renovation work', required: true },
      { type: 'Experience Resume', folder: 'borrower_docs', description: 'Track record of completed projects', required: true }
    );
  }

  return baseItems;
};

// Generate initial needs list for loan (async function that inserts into database)
const generateInitialNeedsListForLoan = async (loanId, loan, db) => {
  const items = getInitialNeedsList(loan);

  // Check which optional columns exist in the table
  // Since error indicates category and loan_type are required, default to true
  let hasNameColumn = false;
  let hasCategoryColumn = true; // Default to true since error says it's required
  let hasLoanTypeColumn = true; // Default to true since error says it's required
  
  try {
    const columns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' 
      AND column_name IN ('name', 'category', 'loan_type')
    `);
    const columnNames = columns.rows.map(row => row.column_name);
    hasNameColumn = columnNames.includes('name');
    hasCategoryColumn = columnNames.includes('category');
    hasLoanTypeColumn = columnNames.includes('loan_type');
    console.log('[generateInitialNeedsListForLoan] Column check:', { hasNameColumn, hasCategoryColumn, hasLoanTypeColumn, columns: columnNames });
  } catch (error) {
    console.error('[generateInitialNeedsListForLoan] Error checking columns:', error);
    // If check fails, assume category and loan_type are required (based on error message)
    hasCategoryColumn = true;
    hasLoanTypeColumn = true;
  }

  // Determine loan_type from loan data
  const loanType = loan.transaction_type || loan.loan_product || 'general';

  for (const item of items) {
    // Determine category based on folder/document type
    let category = 'general';
    if (item.folder.includes('income') || item.folder.includes('tax') || item.folder.includes('bank')) {
      category = 'financial';
    } else if (item.folder.includes('property') || item.folder.includes('lease') || item.folder.includes('rent')) {
      category = 'property';
    } else if (item.folder.includes('identification') || item.folder.includes('entity')) {
      category = 'identity';
    } else if (item.folder.includes('construction') || item.folder.includes('contract')) {
      category = 'construction';
    }

    // Build INSERT statement - always include category and loan_type since errors indicate they're required
    try {
      // Build column list and values dynamically based on what exists
      const columns = ['loan_id'];
      const values = [loanId];
      const placeholders = ['$1'];
      let paramIndex = 1;

      if (hasNameColumn) {
        columns.push('name');
        values.push(item.type);
        placeholders.push(`$${++paramIndex}`);
      }
      if (hasCategoryColumn) {
        columns.push('category');
        values.push(category);
        placeholders.push(`$${++paramIndex}`);
      }
      if (hasLoanTypeColumn) {
        columns.push('loan_type');
        values.push(loanType);
        placeholders.push(`$${++paramIndex}`);
      }
      
      // Add description, status, and is_required (use name and category instead of document_type/folder_name)
      columns.push('description', 'status', 'is_required');
      values.push(item.description || '', 'pending', item.required !== false);
      placeholders.push(`$${++paramIndex}`, `$${++paramIndex}`, `$${++paramIndex}`);

      // Check if this document type already exists for this loan to prevent duplicates
      // Use name and category instead of document_type and folder_name
      const existingCheck = await db.query(`
        SELECT id FROM needs_list_items 
        WHERE loan_id = $1 AND name = $2 AND category = $3
        LIMIT 1
      `, [loanId, item.type, item.folder]);
      
      if (existingCheck.rows.length > 0) {
        console.log(`[generateInitialNeedsListForLoan] Skipping duplicate: ${item.type} in ${item.folder}`);
        continue; // Skip if already exists
      }

      const query = `
        INSERT INTO needs_list_items (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;
      
      console.log('[generateInitialNeedsListForLoan] Insert query:', query);
      console.log('[generateInitialNeedsListForLoan] Values count:', values.length, 'Placeholders count:', placeholders.length);
      
      await db.query(query, values);
    } catch (insertError) {
      console.error('[generateInitialNeedsListForLoan] Insert error for item:', item.type, insertError.message);
      // If insert fails, try a simpler insert without optional columns
      console.error('[generateInitialNeedsListForLoan] Insert failed, trying fallback:', insertError.message);
      try {
        // Fallback: use name and category (required columns)
        await db.query(`
          INSERT INTO needs_list_items (loan_id, name, category, description, loan_type, is_required)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [loanId, item.type, item.folder, item.description || '', loanType, item.required !== false]);
      } catch (fallbackError) {
        console.error('[generateInitialNeedsListForLoan] Fallback insert also failed:', fallbackError.message);
        throw insertError; // Throw original error
      }
    }
  }
};

module.exports = { 
  generateSoftQuote, 
  calculateDSCR, 
  shouldAutoDecline, 
  getInitialNeedsList,
  generateInitialNeedsListForLoan,
  LOAN_PRODUCTS 
};
