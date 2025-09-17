#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(reportDir = 'report') {
    this.reportDir = reportDir;
    this.thresholds = {
      upload: { warning: 2000, critical: 5000, docs_per_sec_min: 5 },
      download: { warning: 30000, critical: 60000, docs_per_sec_min: 10 }
    };
  }

  parseMetrics() {
    const metrics = {
      upload: [],
      download: []
    };

    const files = fs.readdirSync(this.reportDir);
    const uploadFiles = files.filter(f => f.startsWith('workflow-upload-stdout'));
    const downloadFiles = files.filter(f => f.startsWith('workflow-download-stdout'));

    uploadFiles.forEach(file => {
      const content = fs.readFileSync(path.join(this.reportDir, file), 'utf8');
      const userMatch = file.match(/workflow-upload-stdout(\d+)/);
      const userId = userMatch ? parseInt(userMatch[1]) : 0;
      
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('UPLOAD METRICS:')) {
          const match = line.match(/(\d+) docs in ([\d.]+)ms \(([\d.]+) docs\/sec\)/);
          if (match) {
            metrics.upload.push({
              user: userId,
              docs: parseInt(match[1]),
              duration: parseFloat(match[2]),
              docs_per_sec: parseFloat(match[3])
            });
          }
        }
      });
    });

    downloadFiles.forEach(file => {
      const content = fs.readFileSync(path.join(this.reportDir, file), 'utf8');
      const userMatch = file.match(/workflow-download-stdout(\d+)/);
      const userId = userMatch ? parseInt(userMatch[1]) : 0;
      
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('DOWNLOAD METRICS:')) {
          const match = line.match(/(\d+) docs in ([\d.]+)ms \(([\d.]+) docs\/sec\)/);
          if (match) {
            metrics.download.push({
              user: userId,
              docs: parseInt(match[1]),
              duration: parseFloat(match[2]),
              docs_per_sec: parseFloat(match[3])
            });
          }
        }
      });
    });

    return metrics;
  }

  calculateStats(metrics) {
    const stats = {};
    
    ['upload', 'download'].forEach(phase => {
      const phaseMetrics = metrics[phase];
      if (phaseMetrics.length === 0) return;

      const durations = phaseMetrics.map(m => m.duration);
      const docsPerSec = phaseMetrics.map(m => m.docs_per_sec);
      const totalDocs = phaseMetrics.reduce((sum, m) => sum + m.docs, 0);

      stats[phase] = {
        count: phaseMetrics.length,
        total_docs: totalDocs,
        avg_duration: durations.reduce((a, b) => a + b, 0) / durations.length,
        min_duration: Math.min(...durations),
        max_duration: Math.max(...durations),
        avg_docs_per_sec: docsPerSec.reduce((a, b) => a + b, 0) / docsPerSec.length,
        min_docs_per_sec: Math.min(...docsPerSec),
        max_docs_per_sec: Math.max(...docsPerSec),
        p95_duration: this.percentile(durations, 95),
        p99_duration: this.percentile(durations, 99)
      };
    });

    return stats;
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  checkPerformance(stats) {
    const issues = [];

    ['upload', 'download'].forEach(phase => {
      const phaseStats = stats[phase];
      if (!phaseStats) return;

      const threshold = this.thresholds[phase];

      if (phaseStats.avg_duration > threshold.critical) {
        issues.push({
          type: 'critical',
          phase,
          metric: 'duration',
          value: phaseStats.avg_duration,
          threshold: threshold.critical,
          message: `${phase} duration (${phaseStats.avg_duration.toFixed(2)}ms) exceeds critical threshold (${threshold.critical}ms)`
        });
      } else if (phaseStats.avg_duration > threshold.warning) {
        issues.push({
          type: 'warning',
          phase,
          metric: 'duration',
          value: phaseStats.avg_duration,
          threshold: threshold.warning,
          message: `${phase} duration (${phaseStats.avg_duration.toFixed(2)}ms) exceeds warning threshold (${threshold.warning}ms)`
        });
      }

      if (phaseStats.avg_docs_per_sec < threshold.docs_per_sec_min) {
        issues.push({
          type: 'warning',
          phase,
          metric: 'docs_per_sec',
          value: phaseStats.avg_docs_per_sec,
          threshold: threshold.docs_per_sec_min,
          message: `${phase} throughput (${phaseStats.avg_docs_per_sec.toFixed(2)} docs/sec) below minimum threshold (${threshold.docs_per_sec_min} docs/sec)`
        });
      }
    });

    return issues;
  }

  generateReport() {
    console.log('CHT Scalability Performance Analysis');
    console.log('=====================================\n');

    const metrics = this.parseMetrics();
    const stats = this.calculateStats(metrics);
    const issues = this.checkPerformance(stats);

    if (stats.upload) {
      console.log('UPLOAD PERFORMANCE:');
      console.log(`  Operations: ${stats.upload.count}`);
      console.log(`  Total docs: ${stats.upload.total_docs}`);
      console.log(`  Avg duration: ${stats.upload.avg_duration.toFixed(2)}ms`);
      console.log(`  Min/Max duration: ${stats.upload.min_duration.toFixed(2)}ms / ${stats.upload.max_duration.toFixed(2)}ms`);
      console.log(`  P95/P99 duration: ${stats.upload.p95_duration.toFixed(2)}ms / ${stats.upload.p99_duration.toFixed(2)}ms`);
      console.log(`  Avg throughput: ${stats.upload.avg_docs_per_sec.toFixed(2)} docs/sec`);
      console.log(`  Min/Max throughput: ${stats.upload.min_docs_per_sec.toFixed(2)} / ${stats.upload.max_docs_per_sec.toFixed(2)} docs/sec\n`);
    }

    if (stats.download) {
      console.log('DOWNLOAD PERFORMANCE:');
      console.log(`  Operations: ${stats.download.count}`);
      console.log(`  Total docs: ${stats.download.total_docs}`);
      console.log(`  Avg duration: ${stats.download.avg_duration.toFixed(2)}ms`);
      console.log(`  Min/Max duration: ${stats.download.min_duration.toFixed(2)}ms / ${stats.download.max_duration.toFixed(2)}ms`);
      console.log(`  P95/P99 duration: ${stats.download.p95_duration.toFixed(2)}ms / ${stats.download.p99_duration.toFixed(2)}ms`);
      console.log(`  Avg throughput: ${stats.download.avg_docs_per_sec.toFixed(2)} docs/sec`);
      console.log(`  Min/Max throughput: ${stats.download.min_docs_per_sec.toFixed(2)} / ${stats.download.max_docs_per_sec.toFixed(2)} docs/sec\n`);
    }

    if (issues.length > 0) {
      console.log('PERFORMANCE ISSUES:');
      issues.forEach(issue => {
        console.log(`  ${issue.message}`);
      });
      console.log('');
    } else {
      console.log('All performance metrics within acceptable thresholds\n');
    }

    console.log('SCALING RECOMMENDATIONS:');
    if (issues.some(i => i.type === 'critical')) {
      console.log('  CRITICAL: Do not scale up - fix performance issues first');
    } else if (issues.some(i => i.type === 'warning')) {
      console.log('  WARNING: Monitor closely if scaling up');
    } else {
      console.log('  GOOD: Safe to scale up to next level');
    }

    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      stats,
      issues,
      recommendations: this.getScalingRecommendations(issues)
    };

    fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to: performance-report.json');
  }

  getScalingRecommendations(issues) {
    const criticalIssues = issues.filter(i => i.type === 'critical');
    const warningIssues = issues.filter(i => i.type === 'warning');

    if (criticalIssues.length > 0) {
      return {
        action: 'DO_NOT_SCALE',
        reason: 'Critical performance issues detected',
        next_steps: [
          'Investigate and fix performance bottlenecks',
          'Check server resources (CPU, memory, disk I/O)',
          'Review database configuration and indexes',
          'Consider reducing data volume or user count'
        ]
      };
    } else if (warningIssues.length > 0) {
      return {
        action: 'SCALE_CAREFULLY',
        reason: 'Performance warnings detected',
        next_steps: [
          'Monitor performance closely during scaling',
          'Scale incrementally (small steps)',
          'Set up performance monitoring alerts',
          'Have rollback plan ready'
        ]
      };
    } else {
      return {
        action: 'SAFE_TO_SCALE',
        reason: 'All performance metrics within acceptable ranges',
        next_steps: [
          'Proceed with next scaling level',
          'Continue monitoring performance',
          'Document baseline performance metrics'
        ]
      };
    }
  }
}

if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.generateReport();
}

module.exports = PerformanceAnalyzer;
