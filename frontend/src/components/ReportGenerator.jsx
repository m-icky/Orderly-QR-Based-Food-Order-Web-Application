import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate } from '../utils/format';

export default function ReportGenerator({ data, isGenerating, onComplete }) {
  const reportRef = useRef();

  React.useEffect(() => {
    if (isGenerating && data) {
      const element = reportRef.current;
      const opt = {
        margin:       0.4,
        filename:     `Analytics_Report_${data.period}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 1.5, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        if (onComplete) onComplete();
      });
    }
  }, [isGenerating, data, onComplete]);

  if (!data) return null;

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '8.27in' }}>
      <div ref={reportRef} style={{ width: '100%', maxWidth: '7.27in', padding: '0.4in', margin: '0 auto', padding: '40px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#1f2937', backgroundColor: '#ffffff' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>Analytics Report</h1>
            <p style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>
              Period: <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{data.period}</span>
            </p>
            <p style={{ fontSize: '14px', color: '#4b5563', margin: '4px 0 0 0' }}>
              Generated on: {formatDate(new Date())}
            </p>
            {data.downloadedBy && (
              <p style={{ fontSize: '12px', color: '#10B981', margin: '8px 0 0 0', fontWeight: 'bold' }}>
                Prepared by: {data.downloadedBy}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bolder', margin: '0 0 4px 0', color: '#FF6B35' }}>
              {data.shopDetails ? data.shopDetails.name : 'Orderly Platform'}
            </h2>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 2px 0' }}>
              {data.shopDetails?.phone || ''}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, maxWidth: '200px', marginLeft: 'auto' }}>
              {data.shopDetails?.address || ''}
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: '600', textTransform: 'uppercase' }}>Total Revenue</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#10B981' }}>{formatCurrency(data.totalRevenue)}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: '600', textTransform: 'uppercase' }}>Total Orders</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#3B82F6' }}>{data.totalOrders}</p>
          </div>
        </div>

        {/* Breakdown Table */}
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>Timeline Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: '600' }}>Date / Time</th>
              <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: '600', textAlign: 'right' }}>Orders</th>
              <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: '600', textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(data.chartData || []).map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{row._id}</td>
                <td style={{ padding: '12px 16px', color: '#374151', textAlign: 'right' }}>{row.orders}</td>
                <td style={{ padding: '12px 16px', color: '#10B981', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
            {(data.chartData || []).length === 0 && (
              <tr>
                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No timeline data available for this period.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Status Counts */}
        <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>Order Status Breakdown</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {(data.statusCounts || []).map((status, idx) => (
              <div key={idx} style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px', minWidth: '120px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{status._id}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{status.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
          Confidential & Proprietary • Orderly Analytics • {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
