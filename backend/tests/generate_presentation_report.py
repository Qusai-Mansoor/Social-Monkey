"""
Enhanced Test Report Generator for Presentation
Parses HTML coverage files and creates beautiful visualizations
"""

import re
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser


class CoverageHTMLParser(HTMLParser):
    """Parse coverage HTML to extract data"""
    def __init__(self):
        super().__init__()
        self.coverage_data = []
        self.in_tbody = False
        self.in_row = False
        self.in_cell = False
        self.current_row = {}
        self.cell_index = 0
        self.current_data = []
        
    def handle_starttag(self, tag, attrs):
        if tag == 'tbody':
            self.in_tbody = True
        elif tag == 'tr' and self.in_tbody:
            self.in_row = True
            self.current_row = {}
            self.cell_index = 0
        elif tag == 'td' and self.in_row:
            self.in_cell = True
            
    def handle_endtag(self, tag):
        if tag == 'tbody':
            self.in_tbody = False
        elif tag == 'tr' and self.in_row:
            if self.current_row and 'file' in self.current_row:
                self.coverage_data.append(self.current_row.copy())
            self.in_row = False
        elif tag == 'td' and self.in_cell:
            self.in_cell = False
            self.cell_index += 1
            
    def handle_data(self, data):
        if self.in_cell and self.in_row:
            data = data.strip()
            if data:
                if self.cell_index == 0:  # File name
                    self.current_row['file'] = data
                elif self.cell_index == 1:  # Statements
                    self.current_row['statements'] = int(data)
                elif self.cell_index == 2:  # Missing
                    self.current_row['missing'] = int(data)
                elif self.cell_index == 4:  # Coverage percentage
                    self.current_row['coverage'] = int(data.replace('%', ''))


class TestReportGenerator:
    def __init__(self, htmlcov_dir: str):
        self.htmlcov_dir = Path(htmlcov_dir)
        self.coverage_data = []
        self.summary = {
            "total_tests": 83,  # From your report
            "passed": 83,
            "failed": 0,
            "skipped": 0,
            "execution_time": 28.26,  # From your report
            "coverage_percentage": 46,
            "total_statements": 0,
            "covered_statements": 0
        }
        
    def parse_coverage_html(self):
        """Parse the index.html file from htmlcov"""
        index_file = self.htmlcov_dir / 'index.html'
        
        if not index_file.exists():
            print(f"❌ Coverage HTML not found at {index_file}")
            return
        
        with open(index_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        parser = CoverageHTMLParser()
        parser.feed(html_content)
        self.coverage_data = parser.coverage_data
        
        # Calculate totals
        self.summary['total_statements'] = sum(d['statements'] for d in self.coverage_data)
        self.summary['covered_statements'] = sum(d['statements'] - d['missing'] for d in self.coverage_data)
        
        print(f"✓ Parsed {len(self.coverage_data)} coverage entries")
        print(f"✓ Total statements: {self.summary['total_statements']}")
        print(f"✓ Covered statements: {self.summary['covered_statements']}")
    
    def categorize_file(self, file_path: str) -> str:
        """Categorize files by directory"""
        if 'analysis' in file_path:
            return 'Analysis'
        elif 'api' in file_path and 'endpoints' in file_path:
            return 'API Endpoints'
        elif 'api' in file_path:
            return 'API Core'
        elif 'core' in file_path:
            return 'Core'
        elif 'db' in file_path:
            return 'Database'
        elif 'models' in file_path:
            return 'Models'
        elif 'schemas' in file_path:
            return 'Schemas'
        elif 'services' in file_path:
            return 'Services'
        elif 'utils' in file_path:
            return 'Utils'
        else:
            return 'Other'
    
    def generate_html_report(self, output_path: str = None):
        """Generate beautiful HTML report"""
        if output_path is None:
            output_path = self.htmlcov_dir.parent / 'tests' / 'Tests_report.html'
        
        # Categorize coverage data
        category_stats = {}
        for item in self.coverage_data:
            category = self.categorize_file(item['file'])
            if category not in category_stats:
                category_stats[category] = {
                    'statements': 0,
                    'missing': 0,
                    'files': 0
                }
            category_stats[category]['statements'] += item['statements']
            category_stats[category]['missing'] += item['missing']
            category_stats[category]['files'] += 1
        
        # Calculate category coverage
        for category in category_stats:
            stats = category_stats[category]
            covered = stats['statements'] - stats['missing']
            stats['coverage'] = int((covered / stats['statements'] * 100) if stats['statements'] > 0 else 0)
        
        # Get top and bottom performers
        sorted_coverage = sorted(
            [d for d in self.coverage_data if d['statements'] > 0],
            key=lambda x: x['coverage'],
            reverse=True
        )
        
        top_10 = sorted_coverage[:10]
        bottom_10 = sorted_coverage[-10:]
        
        # Generate HTML
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Monkey - Test & Coverage Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 50px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 3em;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }}
        
        .header p {{
            font-size: 1.3em;
            opacity: 0.95;
        }}
        
        .timestamp {{
            font-size: 1em !important;
            opacity: 0.8;
            margin-top: 10px;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            padding: 50px;
            background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
        }}
        
        .stat-card {{
            background: white;
            padding: 35px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            text-align: center;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }}
        
        .stat-card:hover {{
            transform: translateY(-10px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
            border-color: #667eea;
        }}
        
        .stat-icon {{
            font-size: 3em;
            margin-bottom: 15px;
        }}
        
        .stat-value {{
            font-size: 3.5em;
            font-weight: bold;
            margin: 15px 0;
        }}
        
        .stat-label {{
            color: #666;
            font-size: 1.2em;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
        }}
        
        .success {{ color: #10b981; }}
        .warning {{ color: #f59e0b; }}
        .info {{ color: #3b82f6; }}
        .primary {{ color: #667eea; }}
        .danger {{ color: #ef4444; }}
        
        .content {{
            padding: 50px;
        }}
        
        .section {{
            margin-bottom: 60px;
        }}
        
        .section-title {{
            font-size: 2.2em;
            color: #333;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 4px solid #667eea;
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
        }}
        
        .chart-container {{
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }}
        
        .chart-title {{
            font-size: 1.5em;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
        }}
        
        .table-container {{
            overflow-x: auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        thead {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        
        th, td {{
            padding: 18px;
            text-align: left;
        }}
        
        th {{
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.95em;
            letter-spacing: 1.5px;
        }}
        
        tbody tr {{
            border-bottom: 1px solid #e5e7eb;
            transition: all 0.2s ease;
        }}
        
        tbody tr:hover {{
            background: #f9fafb;
            transform: scale(1.01);
        }}
        
        .badge {{
            display: inline-block;
            padding: 6px 15px;
            border-radius: 25px;
            font-size: 0.9em;
            font-weight: 700;
        }}
        
        .badge-success {{
            background: #d1fae5;
            color: #065f46;
        }}
        
        .badge-warning {{
            background: #fef3c7;
            color: #92400e;
        }}
        
        .badge-danger {{
            background: #fee2e2;
            color: #991b1b;
        }}
        
        .badge-info {{
            background: #dbeafe;
            color: #1e40af;
        }}
        
        .progress-bar {{
            background: #e5e7eb;
            height: 35px;
            border-radius: 20px;
            overflow: hidden;
            margin: 15px 0;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 1.5s ease;
            font-size: 0.95em;
        }}
        
        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }}
        
        .metric-card {{
            background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
            padding: 25px;
            border-radius: 15px;
            border-left: 5px solid #667eea;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }}
        
        .metric-label {{
            font-size: 0.95em;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        
        .metric-value {{
            font-size: 2.2em;
            font-weight: bold;
            color: #1f2937;
        }}
        
        .footer {{
            background: #1f2937;
            color: white;
            padding: 40px;
            text-align: center;
        }}
        
        .footer p {{
            margin: 10px 0;
            font-size: 1.1em;
        }}
        
        code {{
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }}
        
        @media (max-width: 768px) {{
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
            
            .header h1 {{
                font-size: 2em;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Test & Coverage Report</h1>
            <p><strong>Social Monkey</strong> - Emotion-aware Social Media Helper</p>
            <p class="timestamp">Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🧪</div>
                <div class="stat-value primary">{self.summary['total_tests']}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value success">{self.summary['passed']}</div>
                <div class="stat-label">Tests Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value info">{self.summary['coverage_percentage']}%</div>
                <div class="stat-label">Code Coverage</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-value warning">{self.summary['execution_time']:.2f}s</div>
                <div class="stat-label">Execution Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value primary">{self.summary['total_statements']}</div>
                <div class="stat-label">Total Statements</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✓</div>
                <div class="stat-value success">{self.summary['covered_statements']}</div>
                <div class="stat-label">Covered Lines</div>
            </div>
        </div>
        
        <div class="content">
            <!-- Success Rate -->
            <div class="section">
                <h2 class="section-title"><span>📈</span> Test Success Rate</h2>
                <div class="progress-bar" style="height: 50px;">
                    <div class="progress-fill" style="width: {(self.summary['passed']/self.summary['total_tests']*100):.1f}%; font-size: 1.2em;">
                        {self.summary['passed']}/{self.summary['total_tests']} Tests Passed ({(self.summary['passed']/self.summary['total_tests']*100):.1f}%)
                    </div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="section">
                <h2 class="section-title"><span>📊</span> Visual Analytics</h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <h3 class="chart-title">Coverage by Module</h3>
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">Coverage Distribution</h3>
                        <canvas id="distributionChart"></canvas>
                    </div>
                </div>
                <div class="charts-grid">
                    <div class="chart-container">
                        <h3 class="chart-title">Top 10 Best Coverage</h3>
                        <canvas id="topCoverageChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">Module Coverage Breakdown</h3>
                        <canvas id="moduleChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Category Breakdown -->
            <div class="section">
                <h2 class="section-title"><span>🔍</span> Coverage by Category</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Files</th>
                                <th>Statements</th>
                                <th>Missing</th>
                                <th>Coverage</th>
                            </tr>
                        </thead>
                        <tbody>
"""
        
        # Add category rows
        for category, stats in sorted(category_stats.items(), key=lambda x: x[1]['coverage'], reverse=True):
            badge_class = 'badge-success' if stats['coverage'] >= 80 else 'badge-warning' if stats['coverage'] >= 50 else 'badge-danger'
            html_content += f"""
                            <tr>
                                <td><strong>{category}</strong></td>
                                <td>{stats['files']}</td>
                                <td>{stats['statements']}</td>
                                <td>{stats['missing']}</td>
                                <td>
                                    <div class="progress-bar" style="height: 30px;">
                                        <div class="progress-fill" style="width: {stats['coverage']}%;">
                                            {stats['coverage']}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
"""
        
        html_content += """
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Key Metrics -->
            <div class="section">
                <h2 class="section-title"><span>🎯</span> Key Performance Metrics</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-label">Test Throughput</div>
                        <div class="metric-value success">{:.2f} tests/sec</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Avg Test Duration</div>
                        <div class="metric-value info">{:.0f}ms per test</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Untested Lines</div>
                        <div class="metric-value danger">{}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Test Categories</div>
                        <div class="metric-value primary">4 Categories</div>
                    </div>
                </div>
            </div>
            
            <!-- Top Performers -->
            <div class="section">
                <h2 class="section-title"><span>🏆</span> Top 10 Coverage Leaders</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Module</th>
                                <th>Statements</th>
                                <th>Coverage</th>
                            </tr>
                        </thead>
                        <tbody>
""".format(
    self.summary['total_tests']/self.summary['execution_time'],
    (self.summary['execution_time']/self.summary['total_tests']*1000),
    self.summary['total_statements'] - self.summary['covered_statements']
)
        
        # Add top performers
        for idx, item in enumerate(top_10, 1):
            badge_class = 'badge-success' if item['coverage'] >= 80 else 'badge-warning'
            html_content += f"""
                            <tr>
                                <td><strong>#{idx}</strong></td>
                                <td><code>{item['file']}</code></td>
                                <td>{item['statements']}</td>
                                <td><span class="badge {badge_class}">{item['coverage']}%</span></td>
                            </tr>
"""
        
        # Prepare chart data
        category_labels = list(category_stats.keys())
        category_coverage = [category_stats[cat]['coverage'] for cat in category_labels]
        
        top_files = [item['file'].split('\\')[-1] for item in top_10]
        top_coverage = [item['coverage'] for item in top_10]
        
        coverage_ranges = {
            '0-25%': len([d for d in self.coverage_data if 0 <= d['coverage'] <= 25]),
            '26-50%': len([d for d in self.coverage_data if 26 <= d['coverage'] <= 50]),
            '51-75%': len([d for d in self.coverage_data if 51 <= d['coverage'] <= 75]),
            '76-100%': len([d for d in self.coverage_data if 76 <= d['coverage'] <= 100])
        }
        
        html_content += f"""
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Social Monkey</strong> - Final Year Project 2025</p>
            <p>Test Framework: pytest | Coverage Tool: pytest-cov | Total Files: {len(self.coverage_data)}</p>
            <p style="opacity: 0.7; margin-top: 10px;">Comprehensive Testing & Quality Assurance Report</p>
        </div>
    </div>
    
    <script>
        // Chart.js configuration
        Chart.defaults.font.family = 'Segoe UI';
        Chart.defaults.font.size = 13;
        Chart.defaults.color = '#374151';
        
        // Category Coverage Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {{
            type: 'bar',
            data: {{
                labels: {category_labels},
                datasets: [{{
                    label: 'Coverage %',
                    data: {category_coverage},
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#4facfe', 
                        '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea'
                    ],
                    borderWidth: 0,
                    borderRadius: 8
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{
                        beginAtZero: true,
                        max: 100,
                        ticks: {{
                            callback: function(value) {{
                                return value + '%';
                            }}
                        }}
                    }}
                }},
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }}
            }}
        }});
        
        // Distribution Chart
        const distributionCtx = document.getElementById('distributionChart').getContext('2d');
        new Chart(distributionCtx, {{
            type: 'doughnut',
            data: {{
                labels: ['0-25%', '26-50%', '51-75%', '76-100%'],
                datasets: [{{
                    data: [{coverage_ranges['0-25%']}, {coverage_ranges['26-50%']}, {coverage_ranges['51-75%']}, {coverage_ranges['76-100%']}],
                    backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#10b981'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{
                            padding: 20,
                            font: {{
                                size: 13
                            }}
                        }}
                    }}
                }}
            }}
        }});
        
        // Top Coverage Chart
        const topCoverageCtx = document.getElementById('topCoverageChart').getContext('2d');
        new Chart(topCoverageCtx, {{
            type: 'bar',
            data: {{
                labels: {top_files},
                datasets: [{{
                    label: 'Coverage %',
                    data: {top_coverage},
                    backgroundColor: '#10b981',
                    borderWidth: 0,
                    borderRadius: 8
                }}]
            }},
            options: {{
                indexAxis: 'y',
                responsive: true,
                scales: {{
                    x: {{
                        beginAtZero: true,
                        max: 100
                    }}
                }},
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }}
            }}
        }});
        
        // Module Coverage Chart
        const moduleCtx = document.getElementById('moduleChart').getContext('2d');
        new Chart(moduleCtx, {{
            type: 'pie',
            data: {{
                labels: {category_labels},
                datasets: [{{
                    data: {[category_stats[cat]['statements'] for cat in category_labels]},
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#4facfe', 
                        '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea'
                    ],
                    borderWidth: 3,
                    borderColor: '#fff'
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{
                            padding: 15,
                            font: {{
                                size: 12
                            }}
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n✅ Presentation report generated successfully!")
        print(f"📄 Report saved to: {output_path}")
        print(f"\n📊 Summary:")
        print(f"   Total Tests: {self.summary['total_tests']}")
        print(f"   Passed: {self.summary['passed']} ({(self.summary['passed']/self.summary['total_tests']*100):.1f}%)")
        print(f"   Coverage: {self.summary['coverage_percentage']}%")
        print(f"   Execution Time: {self.summary['execution_time']:.2f}s")
        print(f"   Files Analyzed: {len(self.coverage_data)}")
        
        return output_path


def main():
    """Main function to generate the report"""
    # Get the path to htmlcov directory
    script_dir = Path(__file__).parent.parent
    htmlcov_dir = script_dir / 'htmlcov'
    
    if not htmlcov_dir.exists():
        print(f"❌ Error: Coverage HTML directory not found at {htmlcov_dir}")
        print("Please run tests with coverage first: pytest --cov=app --cov-report=html")
        return
    
    # Generate the HTML report
    generator = TestReportGenerator(str(htmlcov_dir))
    generator.parse_coverage_html()
    output_path = generator.generate_html_report()
    
    # Open in browser
    try:
        import webbrowser
        webbrowser.open(f'file:///{output_path.absolute()}')
        print(f"\n🌐 Report opened in browser")
    except Exception as e:
        print(f"\n💡 Open the report manually: {output_path.absolute()}")


if __name__ == '__main__':
    main()
