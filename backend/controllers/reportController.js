const PDFDocument = require("pdfkit");
const Video = require("../models/Video");
const path = require("path");
const fs = require("fs");

// Generate comprehensive report for all videos
exports.generateReport = async (req, res) => {
  try {
    const videos = await Video.find({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=video-sensitivity-analysis-report.pdf");
    
    doc.pipe(res);

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("VIDEO SENSITIVITY ANALYSIS REPORT", { align: "center" });
    
    doc.moveDown();
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#718096')
       .text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: "center" });
    
    doc.moveDown(2);

    // Summary
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("Summary");
    
    const totalVideos = videos.length;
    const safeVideos = videos.filter(v => v.sensitivity?.status === 'safe').length;
    const sensitiveVideos = videos.filter(v => v.sensitivity?.status === 'sensitive').length;
    const pendingVideos = videos.filter(v => v.sensitivity?.status === 'pending').length;
    
    doc.moveDown(0.5);
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#4a5568')
       .text(`Total Videos: ${totalVideos}`);
    doc.text(`Safe Videos: ${safeVideos}`);
    doc.text(`Sensitive Videos: ${sensitiveVideos}`);
    doc.text(`Pending Analysis: ${pendingVideos}`);
    
    doc.moveDown(2);

    // Detailed List
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("Video Details");
    
    doc.moveDown();
    
    videos.forEach((video, index) => {
      // Add page break if needed
      if (index > 0 && index % 3 === 0) {
        doc.addPage();
      }
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2d3748')
         .text(`${index + 1}. ${video.originalName}`);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4a5568');
      
      doc.text(`• Status: ${video.status.toUpperCase()}`);
      doc.text(`• Sensitivity: ${video.sensitivity?.status.toUpperCase() || 'PENDING'}`);
      
      if (video.sensitivity?.reason) {
        doc.text(`• Reason: ${video.sensitivity.reason}`);
      }
      
      if (video.sensitivity?.confidence) {
        doc.text(`• Confidence: ${(video.sensitivity.confidence * 100).toFixed(2)}%`);
      }
      
      doc.text(`• Duration: ${video.duration ? Math.round(video.duration) + 's' : 'N/A'}`);
      doc.text(`• Size: ${video.size ? (video.size / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}`);
      doc.text(`• Uploaded: ${new Date(video.createdAt).toLocaleDateString()}`);
      
      doc.moveDown();
      
      // Add horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .strokeColor('#e2e8f0')
         .stroke();
      
      doc.moveDown();
    });

    // Footer
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#a0aec0')
         .text(
           `Page ${i + 1} of ${totalPages}`,
           50,
           doc.page.height - 30,
           { align: "center", width: doc.page.width - 100 }
         );
    }

    doc.end();
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};

// Generate single video report
exports.generateVideoReport = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Tenant check
    if (String(video.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="video-report-${video._id}.pdf"`
    );
    
    doc.pipe(res);

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("VIDEO ANALYSIS REPORT", { align: "center" });
    
    doc.moveDown();
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#718096')
       .text(`Video: ${video.originalName}`, { align: "center" });
    
    doc.moveDown(2);

    // Video Information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("Video Information");
    
    doc.moveDown(0.5);
    
    const info = [
      ["Video Name", video.originalName],
      ["Status", video.status.toUpperCase()],
      ["Upload Date", new Date(video.createdAt).toLocaleDateString()],
      ["Duration", `${Math.round(video.duration || 0)} seconds`],
      ["Resolution", video.width && video.height ? `${video.width}×${video.height}` : "N/A"],
      ["File Size", video.size ? `${(video.size / (1024 * 1024)).toFixed(2)} MB` : "N/A"],
    ];
    
    info.forEach(([label, value]) => {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#4a5568')
         .text(label + ": ", { continued: true });
      
      doc.font('Helvetica')
         .fillColor('#2d3748')
         .text(value);
    });
    
    doc.moveDown(2);

    // Sensitivity Analysis
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("Sensitivity Analysis");
    
    doc.moveDown(0.5);
    
    const sensitivity = video.sensitivity || { status: "pending" };
    const status = sensitivity.status.toUpperCase();
    
    // Status with color
    doc.fontSize(14);
    if (status === "SAFE") {
      doc.fillColor('#38a169')
         .text("✓ SAFE");
    } else if (status === "SENSITIVE") {
      doc.fillColor('#e53e3e')
         .text("⚠ SENSITIVE");
    } else {
      doc.fillColor('#d69e2e')
         .text("⏳ PENDING");
    }
    
    doc.moveDown(0.5);
    
    if (sensitivity.reason) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#4a5568')
         .text(`Reason: ${sensitivity.reason}`);
    }
    
    if (sensitivity.confidence) {
      doc.text(`Confidence: ${(sensitivity.confidence * 100).toFixed(2)}%`);
    }
    
    if (sensitivity.checkedAt) {
      doc.text(`Analyzed: ${new Date(sensitivity.checkedAt).toLocaleString()}`);
    }
    
    doc.moveDown(2);

    // Analysis Details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text("Analysis Details");
    
    doc.moveDown(0.5);
    
    const details = [
      ["Analysis Requested", video.analysisRequested ? "Yes" : "No"],
      ["Analysis Completed", video.analysisDone ? "Yes" : "No"],
      ["Retry Attempts", video.analysisRetries || 0],
      ["Last Updated", new Date(video.updatedAt).toLocaleString()],
    ];
    
    doc.fontSize(11);
    details.forEach(([label, value]) => {
      doc.font('Helvetica-Bold')
         .fillColor('#4a5568')
         .text(label + ": ", { continued: true });
      
      doc.font('Helvetica')
         .fillColor('#2d3748')
         .text(value);
    });
    
    doc.moveDown(3);

    // Footer
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#a0aec0')
       .text("Generated by Video Sensitivity Analysis System", {
         align: "center",
         width: doc.page.width - 100
       });
    
    doc.text(`Report ID: ${video._id}`, {
      align: "center",
      width: doc.page.width - 100
    });
    
    doc.text(`Page 1 of 1`, {
      align: "center",
      width: doc.page.width - 100
    });

    doc.end();
  } catch (err) {
    console.error("Single report error:", err);
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};