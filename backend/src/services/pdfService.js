const PDFDocument = require('pdfkit');
const Lead = require('../models/Lead');
const LeadFollowup = require('../models/LeadFollowup');
const LeadActivity = require('../models/LeadActivity');
const { buildLeadFilterQuery } = require('./leadService');

/**
 * Generate Landscape Company/Filtered Leads PDF Report
 */
const generateLeadsLandscapePDF = async (currentUser, queryParams) => {
  const query = buildLeadFilterQuery(currentUser, queryParams);

  const leads = await Lead.find(query)
    .populate('assignedTo', 'name employeeId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 30
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Colors
      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#2563EB';  // Blue 600
      const mutedText = '#64748B';    // Slate 500
      const borderColor = '#E2E8F0';  // Slate 200

      // Header Banner
      doc.rect(30, 30, 782, 50).fill('#F8FAFC');
      doc.rect(30, 30, 782, 50).stroke(borderColor);

      doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text('DRIVE LINE', 45, 42);
      doc.fillColor(mutedText).fontSize(10).font('Helvetica').text('Automobile Parts CRM — Lead Report', 45, 62);

      const generatedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      doc.fillColor(mutedText).fontSize(9).text(`Generated: ${generatedDate}`, 650, 42, { align: 'right' });
      doc.text(`Total Leads: ${leads.length}`, 650, 58, { align: 'right' });

      // Filters text
      let filterSummary = [];
      if (queryParams.status) filterSummary.push(`Status: ${queryParams.status}`);
      if (queryParams.priority) filterSummary.push(`Priority: ${queryParams.priority}`);
      if (queryParams.followUp) filterSummary.push(`Follow-up: ${queryParams.followUp}`);
      if (queryParams.search) filterSummary.push(`Search: "${queryParams.search}"`);
      const filterText = filterSummary.length > 0 ? filterSummary.join(' | ') : 'All Active Leads';

      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('Filters Applied: ', 30, 92, { continued: true });
      doc.font('Helvetica').fillColor(mutedText).text(filterText);

      // Table Geometry
      const startY = 110;
      const rowHeight = 22;
      const headers = [
        { title: '#', width: 25, align: 'left' },
        { title: 'Customer', width: 95, align: 'left' },
        { title: 'Mobile', width: 85, align: 'left' },
        { title: 'Vehicle', width: 110, align: 'left' },
        { title: 'Part Required', width: 135, align: 'left' },
        { title: 'Part No.', width: 75, align: 'left' },
        { title: 'Status', width: 70, align: 'center' },
        { title: 'Priority', width: 55, align: 'center' },
        { title: 'Assigned To', width: 85, align: 'left' },
        { title: 'Next Follow-up', width: 47, align: 'right' }
      ];

      // Draw Table Header
      let currentY = startY;
      doc.rect(30, currentY, 782, rowHeight).fill('#1E293B');

      let currentX = 35;
      headers.forEach((h) => {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(h.title, currentX, currentY + 6, {
          width: h.width,
          align: h.align
        });
        currentX += h.width;
      });

      currentY += rowHeight;

      // Draw Rows
      leads.forEach((lead, index) => {
        // Page break if near bottom
        if (currentY > 530) {
          doc.addPage({ layout: 'landscape', size: 'A4', margin: 30 });
          currentY = 40;

          // Repeat table header on new page
          doc.rect(30, currentY, 782, rowHeight).fill('#1E293B');
          let headerX = 35;
          headers.forEach((h) => {
            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(h.title, headerX, currentY + 6, {
              width: h.width,
              align: h.align
            });
            headerX += h.width;
          });
          currentY += rowHeight;
        }

        // Row background
        const bg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(30, currentY, 782, rowHeight).fill(bg);
        doc.rect(30, currentY, 782, rowHeight).stroke(borderColor);

        let rowX = 35;
        doc.font('Helvetica').fontSize(8).fillColor(primaryColor);

        // 1. #
        doc.text(String(index + 1), rowX, currentY + 6, { width: 25, align: 'left' });
        rowX += 25;

        // 2. Customer
        const custName = lead.customerName || (lead.companyName || '-');
        doc.text(custName.length > 15 ? custName.substring(0, 14) + '…' : custName, rowX, currentY + 6, { width: 95, align: 'left' });
        rowX += 95;

        // 3. Mobile
        doc.text(lead.mobileNumber || '-', rowX, currentY + 6, { width: 85, align: 'left' });
        rowX += 85;

        // 4. Vehicle
        const veh = [lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ') || '-';
        doc.text(veh.length > 18 ? veh.substring(0, 17) + '…' : veh, rowX, currentY + 6, { width: 110, align: 'left' });
        rowX += 110;

        // 5. Part Required
        const part = lead.partRequired || '-';
        doc.text(part.length > 22 ? part.substring(0, 21) + '…' : part, rowX, currentY + 6, { width: 135, align: 'left' });
        rowX += 135;

        // 6. Part No.
        const pNo = lead.partNumber || '-';
        doc.text(pNo.length > 12 ? pNo.substring(0, 11) + '…' : pNo, rowX, currentY + 6, { width: 75, align: 'left' });
        rowX += 75;

        // 7. Status
        doc.fillColor(
          lead.status === 'Converted' ? '#16A34A' :
          lead.status === 'Lost' ? '#DC2626' :
          lead.status === 'Quotation' ? '#7C3AED' : '#2563EB'
        ).font('Helvetica-Bold').text(lead.status, rowX, currentY + 6, { width: 70, align: 'center' });
        rowX += 70;

        // 8. Priority
        doc.font('Helvetica').fillColor(
          lead.priority === 'Urgent' ? '#DC2626' :
          lead.priority === 'High' ? '#EA580C' : '#475569'
        ).text(lead.priority, rowX, currentY + 6, { width: 55, align: 'center' });
        rowX += 55;

        // 9. Assigned To
        const assigned = lead.assignedTo ? lead.assignedTo.name : 'Unassigned';
        doc.fillColor(primaryColor).text(assigned.length > 13 ? assigned.substring(0, 12) + '…' : assigned, rowX, currentY + 6, { width: 85, align: 'left' });
        rowX += 85;

        // 10. Next Follow-up
        const followDate = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : '-';
        doc.text(followDate, rowX, currentY + 6, { width: 47, align: 'right' });

        currentY += rowHeight;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Detailed Single Lead PDF Dossier
 */
const generateSingleLeadPDF = async (leadId, currentUser) => {
  const lead = await Lead.findById(leadId)
    .populate('assignedTo', 'name employeeId email phone')
    .populate('createdBy', 'name employeeId')
    .lean();

  if (!lead) {
    throw new Error('Lead not found');
  }

  const followups = await LeadFollowup.find({ leadId })
    .populate('createdBy', 'name employeeId')
    .sort({ createdAt: -1 })
    .lean();

  const activities = await LeadActivity.find({ leadId })
    .populate('performedBy', 'name employeeId')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'portrait',
        size: 'A4',
        margin: 40
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const primaryColor = '#0F172A';
      const accentColor = '#2563EB';
      const mutedText = '#64748B';
      const boxBg = '#F8FAFC';
      const borderColor = '#E2E8F0';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('DRIVE LINE', 55, 52);
      doc.fillColor('#94A3B8').fontSize(10).font('Helvetica').text('Automobile Parts Lead Dossier', 55, 76);

      const createdDate = new Date(lead.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      doc.fillColor('#94A3B8').fontSize(9).text(`Lead ID: ${lead._id.toString().substring(18)}`, 380, 55, { align: 'right' });
      doc.text(`Created: ${createdDate}`, 380, 72, { align: 'right' });

      let y = 115;

      // Section 1: Customer Information Box
      doc.rect(40, y, 250, 110).fill(boxBg).stroke(borderColor);
      doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text('CUSTOMER INFORMATION', 50, y + 10);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Customer Name:', 50, y + 30);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(lead.customerName || 'N/A', 130, y + 30);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Mobile Number:', 50, y + 46);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(lead.mobileNumber || 'N/A', 130, y + 46);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Alternate Mobile:', 50, y + 62);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(lead.alternateMobileNumber || 'N/A', 130, y + 62);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Company / Workshop:', 50, y + 78);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(lead.companyName || 'N/A', 130, y + 78);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Customer Type / Loc:', 50, y + 94);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(`${lead.customerType || 'Other'} (${lead.location || 'N/A'})`, 130, y + 94);

      // Section 2: Status & Assignment Box
      doc.rect(305, y, 250, 110).fill(boxBg).stroke(borderColor);
      doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text('STATUS & SALES', 315, y + 10);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Current Status:', 315, y + 30);
      doc.fillColor('#16A34A').fontSize(10).font('Helvetica-Bold').text(lead.status, 395, y + 29);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Priority:', 315, y + 46);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(lead.priority, 395, y + 46);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Assigned To:', 315, y + 62);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(lead.assignedTo ? `${lead.assignedTo.name} (${lead.assignedTo.employeeId})` : 'Unassigned', 395, y + 62);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Next Follow-up:', 315, y + 78);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : 'None Scheduled', 395, y + 78);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Source / Creator:', 315, y + 94);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(`${lead.source} / ${lead.createdBy ? lead.createdBy.name : 'System'}`, 395, y + 94);

      y += 125;

      // Section 3: Automobile Part & Vehicle Requirement
      doc.rect(40, y, 515, 100).fill(boxBg).stroke(borderColor);
      doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text('AUTOMOBILE & PART REQUIREMENT', 50, y + 10);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Vehicle Make & Model:', 50, y + 30);
      const vehicleDesc = [lead.vehicleMake, lead.vehicleModel, lead.vehicleYear ? `(${lead.vehicleYear})` : ''].filter(Boolean).join(' ');
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(vehicleDesc || 'Not specified', 160, y + 30);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Part Required:', 50, y + 46);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(lead.partRequired || 'Not specified', 160, y + 46);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Part Number (OEM / SKU):', 50, y + 62);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(lead.partNumber || 'N/A', 160, y + 62);

      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Quantity & Details:', 50, y + 78);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(`Qty: ${lead.quantity || 1} — ${lead.requirementDetails || 'No additional specifications'}`, 160, y + 78);

      y += 115;

      // Remarks / Lost reason if applicable
      if (lead.remarks || lead.lostReason) {
        doc.rect(40, y, 515, 45).fill('#FFFBEB').stroke('#FDE68A');
        doc.fillColor('#B45309').fontSize(9).font('Helvetica-Bold').text('Notes & Remarks:', 50, y + 8);
        const remarkTxt = lead.remarks ? lead.remarks : `Lost Reason: ${lead.lostReason}`;
        doc.fillColor('#78350F').fontSize(8).font('Helvetica').text(remarkTxt, 50, y + 22, { width: 495 });
        y += 55;
      }

      // Section 4: Follow-up History
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Follow-up History', 40, y);
      y += 18;

      if (followups.length === 0) {
        doc.fillColor(mutedText).fontSize(9).font('Helvetica').text('No follow-up interactions recorded yet.', 40, y);
        y += 20;
      } else {
        followups.slice(0, 4).forEach((f) => {
          doc.rect(40, y, 515, 34).fill('#FFFFFF').stroke(borderColor);
          const fDate = new Date(f.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          doc.fillColor(accentColor).fontSize(8).font('Helvetica-Bold').text(`${f.createdBy ? f.createdBy.name : 'Employee'} — ${fDate}`, 50, y + 6);
          if (f.statusChangedTo) {
            doc.fillColor('#16A34A').fontSize(8).font('Helvetica-Bold').text(`Status: ${f.statusChangedTo}`, 400, y + 6, { align: 'right' });
          }
          doc.fillColor(primaryColor).fontSize(8).font('Helvetica').text(f.remarks, 50, y + 18, { width: 495 });
          y += 38;
        });
      }

      y += 10;

      // Section 5: Activity Log
      if (y < 700) {
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Activity Timeline', 40, y);
        y += 16;
        activities.slice(0, 4).forEach((act) => {
          const actDate = new Date(act.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });
          doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold').text(`• ${actDate} [${act.action}]`, 45, y);
          doc.fillColor(primaryColor).font('Helvetica').text(`by ${act.performedBy ? act.performedBy.name : 'System'} — ${act.remarks || ''}`, 160, y, { width: 380 });
          y += 14;
        });
      }

      // Footer
      doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Drive Line Automobile Parts CRM • Internal Confidential Report', 40, 780, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateLeadsLandscapePDF,
  generateSingleLeadPDF
};
