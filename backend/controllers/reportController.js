const PDFDocument = require("pdfkit");
const Video = require("../models/Video");

const generateReport = async (req, res) => {
  const videos = await Video.find({ tenantId: req.user.tenantId });

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=analysis-report.pdf");

  doc.pipe(res);

  doc.fontSize(18).text("Video Sensitivity Analysis Report", {
    align: "center"
  });
  doc.moveDown();

  videos.forEach((video, index) => {
    doc.fontSize(12).text(`Video ${index + 1}`);
    doc.text(`Name: ${video.originalName}`);
    doc.text(`Status: ${video.status}`);
    doc.text(`Nudity: ${video.sensitivity.nudity ? "Yes" : "No"}`);
    doc.text(`Violence: ${video.sensitivity.violence ? "Yes" : "No"}`);
    doc.text(`Confidence: ${video.sensitivity.confidence * 100}%`);
    doc.text(`Uploaded: ${video.createdAt}`);
    doc.moveDown();
  });

  doc.end();
};

module.exports = { generateReport };
