import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Check,
  ShieldCheck,
  PlusCircle,
  Filter
} from 'lucide-react';

export const HousekeepingPage = () => {
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isDamageOpen, setIsDamageOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [taskForm, setTaskForm] = useState({
    roomId: '',
    assignedTo: '',
    priority: 'medium',
    taskType: 'checkout_cleaning',
    notes: ''
  });

  const [damageForm, setDamageForm] = useState({
    damageDescription: '',
    createMaintenanceTicket: true,
    priority: 'high'
  });

  const [message, setMessage] = useState('');

  const fetchHousekeepingData = async () => {
    try {
      setLoading(true);
      const [tasksRes, roomsRes, staffRes] = await Promise.all([
        api.get('/housekeeping/tasks'),
        api.get('/rooms'),
        api.get('/staff')
      ]);
      if (tasksRes.data.success) setTasks(tasksRes.data.data);
      if (roomsRes.data.success) setRooms(roomsRes.data.data);
      if (staffRes.data.success) setStaff(staffRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
  }, []);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/housekeeping/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        setMessage(`Task marked as ${newStatus.replace(/_/g, ' ')}.`);
        fetchHousekeepingData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert('Failed to update task status.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/housekeeping/tasks', taskForm);
      if (res.data.success) {
        setIsNewTaskOpen(false);
        setMessage('Housekeeping task assigned.');
        setTaskForm({ roomId: '', assignedTo: '', priority: 'medium', taskType: 'checkout_cleaning', notes: '' });
        fetchHousekeepingData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleReportDamage = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/housekeeping/tasks/${selectedTask._id}/report-damage`, damageForm);
      if (res.data.success) {
        setIsDamageOpen(false);
        setMessage('Damage logged and maintenance ticket dispatched.');
        fetchHousekeepingData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert('Failed to report damage.');
    }
  };

  const filteredTasks = tasks.filter(
    (t) => statusFilter === 'all' || t.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Housekeeping & Room Readiness</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track cleaning queues, prioritize departures, and ensure pristine guest room inspections
          </p>
        </div>

        <Button variant="primary" icon={PlusCircle} onClick={() => setIsNewTaskOpen(true)}>
          Assign Cleaning Task
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/80">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter Queue:
        </span>
        {['all', 'dirty', 'cleaning_in_progress', 'clean', 'inspected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === st
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Task Queue Cards */}
      {loading ? (
        <LoadingSpinner text="Retrieving housekeeping queue..." />
      ) : filteredTasks.length === 0 ? (
        <Card className="py-12 text-center text-slate-400 text-xs">
          No tasks found in this cleaning queue.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => (
            <Card key={t._id} className="hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xl font-black text-slate-900">
                      Room #{t.roomId?.roomNumber || 'Room'}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      Floor {t.roomId?.floor || '1'} • {t.taskType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={t.priority}>{t.priority}</Badge>
                    <Badge variant={t.status}>{t.status}</Badge>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">Assigned Attendant:</span>{' '}
                    {t.assignedTo?.name || 'Unassigned'}
                  </p>
                  {t.notes && (
                    <p className="bg-slate-50 p-2 rounded-lg text-slate-500 text-[11px] border border-slate-100">
                      {t.notes}
                    </p>
                  )}
                  {t.damageReported && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                      <span className="font-bold">Damage Reported:</span> {t.damageDescription}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Workflow */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedTask(t);
                    setIsDamageOpen(true);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Report Damage</span>
                </button>

                <div className="flex gap-1.5">
                  {t.status === 'dirty' && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Play}
                      onClick={() => handleUpdateStatus(t._id, 'cleaning_in_progress')}
                    >
                      Start
                    </Button>
                  )}
                  {t.status === 'cleaning_in_progress' && (
                    <Button
                      size="sm"
                      variant="success"
                      icon={Check}
                      onClick={() => handleUpdateStatus(t._id, 'clean')}
                    >
                      Mark Clean
                    </Button>
                  )}
                  {t.status === 'clean' && (
                    <Button
                      size="sm"
                      variant="gold"
                      icon={ShieldCheck}
                      onClick={() => handleUpdateStatus(t._id, 'inspected')}
                    >
                      Inspect & Pass
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Cleaning Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Schedule Cleaning Task"
        subtitle="Queue a room for housekeeping"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Select
            label="Room to Clean"
            required
            value={taskForm.roomId}
            onChange={(e) => setTaskForm({ ...taskForm, roomId: e.target.value })}
          >
            <option value="">-- Choose Room --</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                Room #{r.roomNumber} (Current Status: {r.housekeepingStatus})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Attendant"
              value={taskForm.assignedTo}
              onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
            >
              <option value="">-- Unassigned (General Queue) --</option>
              {staff.map((s) => (
                <option key={s.userId?._id} value={s.userId?._id}>
                  {s.userId?.name} ({s.department})
                </option>
              ))}
            </Select>

            <Select
              label="Priority Level"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              options={[
                { label: 'Low Priority', value: 'low' },
                { label: 'Medium (Standard)', value: 'medium' },
                { label: 'High (Immediate Check-in)', value: 'high' },
                { label: 'Critical Alert', value: 'critical' }
              ]}
            />
          </div>

          <Select
            label="Cleaning Type"
            value={taskForm.taskType}
            onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
            options={[
              { label: 'Checkout Full Cleaning', value: 'checkout_cleaning' },
              { label: 'Daily Stayover Cleaning', value: 'daily_cleaning' },
              { label: 'Deep Sanitize & Shampoo', value: 'deep_cleaning' },
              { label: 'Quick Touch Up & Restock', value: 'touch_up' }
            ]}
          />

          <Input
            label="Special Instructions"
            value={taskForm.notes}
            onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
            placeholder="Extra towels, refill espresso pods"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsNewTaskOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!taskForm.roomId}>
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Damage Modal */}
      <Modal
        isOpen={isDamageOpen}
        onClose={() => setIsDamageOpen(false)}
        title="Report Room Damage"
        subtitle={`Room #${selectedTask?.roomId?.roomNumber}`}
      >
        <form onSubmit={handleReportDamage} className="space-y-4">
          <Input
            label="Damage Description"
            required
            value={damageForm.damageDescription}
            onChange={(e) => setDamageForm({ ...damageForm, damageDescription: e.target.value })}
            placeholder="e.g. Broken bathroom towel rack, water leak under vanity"
          />

          <Select
            label="Damage Urgency"
            value={damageForm.priority}
            onChange={(e) => setDamageForm({ ...damageForm, priority: e.target.value })}
            options={[
              { label: 'Medium Issue (Can wait for next shift)', value: 'medium' },
              { label: 'High Priority (Fix before check-in)', value: 'high' },
              { label: 'Critical: Take Room Out Of Service!', value: 'critical' }
            ]}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ticketCheck"
              checked={damageForm.createMaintenanceTicket}
              onChange={(e) => setDamageForm({ ...damageForm, createMaintenanceTicket: e.target.checked })}
              className="rounded border-slate-300 text-brand-600"
            />
            <label htmlFor="ticketCheck" className="text-xs text-slate-700 font-medium">
              Automatically create maintenance repair ticket and alert engineering
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsDamageOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Submit Damage Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

