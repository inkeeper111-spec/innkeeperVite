import api from './axios';

const blobConfig = { responseType: 'blob', skipToast: true, skipSuccessToast: true };

export const payrollApi = {
  getGlobalConfig: () => api.get('/payroll/global-configuration'),
  saveGlobalConfig: (data) => api.put('/payroll/global-configuration', data),
  getCutoff: (monthYear, type = 'attendance') =>
    api.get('/payroll/cutoff', { params: { monthYear, type } }),

  getTaxConfig: () => api.get('/payroll/tax-config'),
  saveTaxConfig: (data) => api.put('/payroll/tax-config', data),

  listWeekoff: () => api.get('/payroll/weekoff-categories'),
  createWeekoff: (data) => api.post('/payroll/weekoff-categories', data),
  updateWeekoff: (id, data) => api.put(`/payroll/weekoff-categories/${id}`, data),
  deleteWeekoff: (id) => api.delete(`/payroll/weekoff-categories/${id}`),

  listHolidays: (year) => api.get('/payroll/holidays', { params: { year } }),
  createHoliday: (data) => api.post('/payroll/holidays', data),
  updateHoliday: (id, data) => api.put(`/payroll/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/payroll/holidays/${id}`),
  holidayTemplate: () => api.get('/payroll/holidays/template', blobConfig),
  uploadHolidays: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/payroll/holidays/upload', fd);
  },
  holidayUploadLogs: () => api.get('/payroll/holidays/upload-logs'),

  getLeaveConfig: (year) => api.get('/payroll/leave-config', { params: { year } }),
  saveLeaveConfig: (data) => api.put('/payroll/leave-config', data),

  listStaffSalary: () => api.get('/payroll/staff-salary'),
  addStaffSalary: (data) => api.post('/payroll/staff-salary', data),
  updateStaffSalary: (id, data) => api.put(`/payroll/staff-salary/${id}`, data),
  staffTemplate: () => api.get('/payroll/staff-salary/template', blobConfig),
  uploadStaffSalary: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/payroll/staff-salary/upload', fd);
  },
  staffUploadLogs: () => api.get('/payroll/staff-salary/upload-logs'),
  staffData: () => api.get('/payroll/staff-data'),

  attendanceList: (monthYear) => api.get('/payroll/attendance/list', { params: { monthYear } }),
  getAttendance: (staffId, monthYear) =>
    api.get('/payroll/attendance', { params: { staffId, monthYear } }),
  saveAttendance: (data) => api.put('/payroll/attendance', data),
  weekoffUpdation: (data) => api.post('/payroll/weekoff-updation', data),

  listAdvances: (staffId) => api.get('/payroll/advances', { params: { staffId } }),
  createAdvance: (data) => api.post('/payroll/advances', data),
  updateAdvance: (id, data) => api.put(`/payroll/advances/${id}`, data),
  deleteAdvance: (id) => api.delete(`/payroll/advances/${id}`),

  runPayroll: (monthYear) => api.post('/payroll/run', { monthYear }),
  payrollDetails: (monthYear) => api.get('/payroll/details', { params: { monthYear } }),
  payrollByStaff: (params) => api.get('/payroll/by-staff', { params }),
  periodStatus: (data) => api.post('/payroll/period-status', data),
  previousSixMonths: () => api.get('/payroll/previous-six-months'),
  dashboard: () => api.get('/payroll/dashboard'),

  getExportConfig: () => api.get('/payroll/export-config'),
  saveExportConfig: (data) => api.put('/payroll/export-config', data),
  downloadExcel: (monthYear) => api.post('/payroll/download-excel', { monthYear }, blobConfig),
  downloadExcelFull: (monthYear) =>
    api.post('/payroll/download-excel-full', { monthYear }, blobConfig),
  downloadPayslip: (staffId, monthYear) =>
    api.get('/payroll/payslip', { params: { staffId, monthYear }, ...blobConfig })
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
