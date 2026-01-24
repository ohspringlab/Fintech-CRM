const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

const generateTermSheet = async (loan, quote) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `term-sheet-${loan.loan_number || 'unknown'}-${Date.now()}.pdf`;
      
      // Check if we're on Vercel/serverless
      const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      let filePath;
      
      if (isVercel) {
        // On Vercel, collect PDF as buffer using PassThrough stream
        const chunks = [];
        const passThrough = new PassThrough();
        
        passThrough.on('data', (chunk) => chunks.push(chunk));
        passThrough.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            // Write to /tmp temporarily
            filePath = path.join('/tmp', fileName);
            fs.writeFileSync(filePath, pdfBuffer);
            // Return the /tmp path
            // Note: In production, you should upload to cloud storage (S3, etc.) and return the public URL
            resolve(`/tmp/${fileName}`);
          } catch (error) {
            console.error('Error writing PDF to /tmp:', error);
            reject(error);
          }
        });
        
        passThrough.on('error', (error) => {
          console.error('Error in PassThrough stream:', error);
          reject(error);
        });
        
        doc.pipe(passThrough);
      } else {
        // Local development - use uploads directory
        filePath = path.join(__dirname, '../../uploads/term-sheets', fileName);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        stream.on('finish', () => {
          resolve(`/uploads/term-sheets/${fileName}`);
        });
        
        stream.on('error', (error) => {
          console.error('Error writing term sheet PDF:', error);
          reject(error);
        });
      }

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('RPC LENDING', { align: 'center' });
      doc.fontSize(18).font('Helvetica').text('Term Sheet', { align: 'center' });
      doc.moveDown();

      // Loan info
      doc.fontSize(12).font('Helvetica-Bold').text(`Loan Number: ${loan.loan_number || 'N/A'}`);
      doc.font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Property Information
      doc.fontSize(14).font('Helvetica-Bold').text('Subject Property');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Address: ${loan.property_address || 'N/A'}`);
      doc.text(`City, State ZIP: ${loan.property_city || ''}, ${loan.property_state || ''} ${loan.property_zip || ''}`);
      doc.text(`Property Type: ${formatPropertyType(loan.property_type)}`);
      if (loan.property_name) doc.text(`Property Name: ${loan.property_name}`);
      doc.moveDown();

      // Loan Terms
      doc.fontSize(14).font('Helvetica-Bold').text('Proposed Loan Terms');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Loan Amount: ${formatCurrency(quote.loanAmount || 0)}`);
      doc.text(`Property Value: ${formatCurrency(quote.propertyValue || 0)}`);
      doc.text(`Loan-to-Value (LTV): ${quote.ltv || 0}%`);
      
      // Handle interest rate display
      const rateMin = quote.interestRateMin || 0;
      const rateMax = quote.interestRateMax || 0;
      const rateDisplay = quote.rateRange || `${rateMin.toFixed(2)}% - ${rateMax.toFixed(2)}%`;
      doc.text(`Interest Rate Range: ${rateDisplay}`);
      
      doc.text(`Loan Type: ${formatTransactionType(loan.transaction_type)}`);
      doc.text(`Documentation: ${formatDocType(loan.documentation_type || loan.doc_type)}`);
      doc.moveDown();

      // Fees
      doc.fontSize(14).font('Helvetica-Bold').text('Estimated Fees');
      doc.fontSize(11).font('Helvetica');
      
      if (quote.originationPoints) {
        const originationFee = quote.originationFee || ((quote.loanAmount || 0) * (quote.originationPoints / 100));
        doc.text(`Origination Fee (${quote.originationPoints}%): ${formatCurrency(originationFee)}`);
      }
      
      const processingFee = quote.processingFee || 995;
      const underwritingFee = quote.underwritingFee || 1495;
      const appraisalFee = quote.appraisalFee || (loan.property_type === 'commercial' ? 750 : 500);
      
      doc.text(`Processing Fee: ${formatCurrency(processingFee)}`);
      doc.text(`Underwriting Fee: ${formatCurrency(underwritingFee)}`);
      doc.text(`Appraisal Fee: ${formatCurrency(appraisalFee)}`);
      
      const totalClosingCosts = quote.totalClosingCosts || 
        (processingFee + underwritingFee + appraisalFee + (quote.originationFee || 0));
      
      doc.font('Helvetica-Bold').text(`Total Estimated Closing Costs: ${formatCurrency(totalClosingCosts)}`);
      doc.moveDown();

      // Monthly Payment
      doc.fontSize(14).font('Helvetica-Bold').text('Estimated Monthly Payment');
      doc.fontSize(11).font('Helvetica');
      
      if (quote.estimatedMonthlyPayment) {
        doc.text(`Interest Only Payment: ${formatCurrency(quote.estimatedMonthlyPayment)}/month`);
      } else {
        // Calculate if not provided
        const loanAmount = quote.loanAmount || 0;
        const avgRate = ((rateMin + rateMax) / 2) / 100;
        const monthlyPayment = (loanAmount * avgRate) / 12;
        doc.text(`Estimated Interest Only Payment: ${formatCurrency(monthlyPayment)}/month`);
      }
      doc.moveDown();

      // Disclaimer
      doc.moveDown();
      doc.fontSize(9).font('Helvetica-Oblique');
      const disclaimer = quote.disclaimer || 
        'This term sheet is provided for informational purposes only and does not constitute a loan commitment. Final loan terms are subject to credit approval, property appraisal, and underwriting review. Interest rates and fees are subject to change. This is not a loan commitment or guarantee of financing.';
      doc.text(disclaimer, { align: 'justify' });
      doc.moveDown();
      
      if (quote.validUntil) {
        doc.text(`This term sheet is valid until: ${new Date(quote.validUntil).toLocaleDateString()}`);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica');
      doc.text('RPC Lending | Commercial & Residential Bridge Loans', { align: 'center' });

      doc.end();
      
      // Error handling for doc
      doc.on('error', (error) => {
        console.error('Error generating PDF:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Error generating term sheet:', error);
      reject(error);
    }
  });
};

// Generate full loan application PDF
const generateApplicationPdf = async (loan, applicationData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `application-${loan.loan_number}.pdf`;
      const filePath = path.join(__dirname, '../../uploads/applications', fileName);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).font('Helvetica-Bold').text('Loan Application', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Loan Number: ${loan.loan_number}`, { align: 'center' });
      doc.moveDown(2);

      // Add application data sections
      if (applicationData) {
        // Group flat data into sections for better organization
        const sections = {
          'Personal Information': ['fullName', 'email', 'phone', 'ssn', 'dateOfBirth', 'citizenship', 'maritalStatus'],
          'Address': ['addressLine1', 'addressLine2', 'city', 'state', 'zipCode'],
          'Employment': ['employmentStatus', 'employer', 'jobTitle', 'yearsAtJob', 'annualIncome'],
          'Assets': ['bankAccounts', 'realEstate', 'otherAssets'],
          'Liabilities': ['mortgages', 'creditCards', 'otherDebts'],
          'Property Information': ['propertyAddress', 'propertyCity', 'propertyState', 'propertyZip', 'propertyValue'],
          'Loan Information': ['loanAmount', 'loanPurpose'],
          'Additional Information': ['additionalInfo']
        };

        Object.entries(sections).forEach(([sectionName, fields]) => {
          doc.fontSize(14).font('Helvetica-Bold').text(sectionName);
          doc.fontSize(11).font('Helvetica');
          
          fields.forEach(field => {
            const value = applicationData[field];
            if (value) {
              doc.text(`${formatFieldName(field)}: ${value}`);
            }
          });
          
          doc.moveDown();
        });
      }

      // Add state-specific disclosures
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('State Disclosures and Legal Notices', { align: 'center' });
      doc.moveDown();
      
      const state = loan.property_state?.toUpperCase() || 'CA';
      const disclosures = getStateDisclosures(state);
      
      doc.fontSize(11).font('Helvetica');
      disclosures.forEach(disclosure => {
        doc.fontSize(12).font('Helvetica-Bold').text(disclosure.title);
        doc.fontSize(11).font('Helvetica');
        doc.text(disclosure.content, { align: 'left' });
        doc.moveDown();
      });

      // General disclosures
      doc.fontSize(12).font('Helvetica-Bold').text('General Disclosures');
      doc.fontSize(11).font('Helvetica');
      doc.text('This loan application is subject to credit approval and property valuation. Rates and terms are estimates and subject to change. Final terms will be provided in the commitment letter.');
      doc.moveDown();
      doc.text('Riverside Park Capital is licensed in accordance with applicable state and federal lending regulations.');
      doc.moveDown();
      doc.text('By signing this application, you acknowledge that you have read and understand all disclosures provided.');

      doc.end();

      stream.on('finish', () => {
        resolve(`/uploads/applications/${fileName}`);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Helper functions
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(amount));
}

function formatPropertyType(type) {
  if (!type) return 'Not Specified';
  const types = {
    residential: 'Residential (1-4 Units)',
    commercial: 'Commercial',
    'single-family': 'Single Family',
    'multi-family': 'Multi-Family',
    retail: 'Retail',
    office: 'Office',
    industrial: 'Industrial',
    mixed_use: 'Mixed Use'
  };
  return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatTransactionType(type) {
  if (!type) return 'Not Specified';
  const types = {
    purchase_fix_flip: 'Purchase - Fix & Flip',
    purchase_ground_up: 'Purchase - Ground-Up Construction',
    refinance_rate_term: 'Refinance - Rate & Term',
    refinance_cash_out: 'Refinance - Cash-Out',
    purchase: 'Purchase',
    refinance: 'Refinance'
  };
  return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDocType(type) {
  if (!type) return 'Not Specified';
  const types = {
    full_doc: 'Full Documentation',
    light_doc: 'Light Doc (No Tax Returns)',
    bank_statement: 'Bank Statement Program',
    no_doc: 'Streamline No-Doc',
    alt_doc: 'Alternative Documentation'
  };
  return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatSectionTitle(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function formatFieldName(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function getStateDisclosures(state) {
  // State-specific disclosure templates
  const stateDisclosures = {
    'CA': [
      {
        title: 'California Disclosure',
        content: 'This loan is subject to California state lending regulations. Borrower has the right to receive a copy of all loan documents prior to signing. Interest rates and terms are subject to change based on final underwriting approval.'
      },
      {
        title: 'California Fair Lending Notice',
        content: 'It is illegal to discriminate against credit applicants on the basis of race, color, religion, national origin, sex, marital status, age, or because all or part of the applicant\'s income derives from any public assistance program.'
      }
    ],
    'NY': [
      {
        title: 'New York Disclosure',
        content: 'This loan is subject to New York state lending regulations. All loan terms are subject to final approval and may change based on property appraisal and underwriting review.'
      }
    ],
    'FL': [
      {
        title: 'Florida Disclosure',
        content: 'This loan is subject to Florida state lending regulations. Borrower acknowledges receipt of all required disclosures and understands that final loan terms may differ from initial estimates.'
      }
    ],
    'TX': [
      {
        title: 'Texas Disclosure',
        content: 'This loan is subject to Texas state lending regulations. All loan terms are estimates and subject to final underwriting approval and property valuation.'
      }
    ]
  };

  // Return state-specific disclosures or default general disclosure
  return stateDisclosures[state] || [
    {
      title: 'State Disclosure',
      content: `This loan is subject to ${state} state lending regulations. All loan terms are estimates and subject to final underwriting approval, property appraisal, and compliance with applicable state and federal lending laws.`
    }
  ];
}

module.exports = { generateTermSheet, generateApplicationPdf };
