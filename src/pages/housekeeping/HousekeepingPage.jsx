import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Check,
  ShieldCheck,
  PlusCircle,
  Filter,
  GripVertical,
  ChevronRight
} from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'dirty', label: 'Dirty', icon: Sparkles },
  { id: 'cleaning_in_progress', label: 'Cleaning In Progress', icon: Clock },
  { id: 'clean', label: 'Clean', icon: Check },
  { id: 'inspected', label: 'Inspected', icon: ShieldCheck }
];

const STATUS_LABELS = Object.fromEntries(STATUS_COLUMNS.map(({ id, label }) => [id, label]));
const NEXT_STATUS = {
  dirty: 'cleaning_in_progress',
  cleaning_in_progress: 'clean',
  clean: 'inspected'
};

export const HousekeepingPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dataError, setDataError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isDamageOpen, setIsDamageOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [reassignmentSelections, setReassignmentSelections] = useState({});

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
      setDataError('');
      const [tasksRes, roomsRes, staffRes] = await Promise.all([
        api.get('/housekeeping/tasks'),
        api.get('/rooms'),
        api.get('/staff')
      ]);
      if (tasksRes.data.success) setTasks(tasksRes.data.data);
      if (roomsRes.data.success) setRooms(roomsRes.data.data);
      if (staffRes.data.success) setStaff(staffRes.data.data);
    } catch (error) {
      console.error(error);
      setDataError(error.response?.data?.message || 'Unable to retrieve the housekeeping queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
  }, []);

  const handleUpdateStatus = async (taskId, newStatus) => {
    const task = tasks.find((item) => item._id === taskId);
    if (!task) return;

    const allowedStatus = task.status === 'rejected'
      ? null
      : NEXT_STATUS[task.status];
    if (allowedStatus !== newStatus) {
      setUpdateError('Invalid status transition. Work can only move through the next readiness stage.');
      return;
    }

    const previousStatus = task.status;
    setUpdatingTaskId(taskId);
    setUpdateError('');
    setTasks((current) => current.map((item) => (
      item._id === taskId ? { ...item, status: newStatus } : item
    )));

    try {
      const res = await api.patch(`/housekeeping/tasks/${taskId}/status`, { status: newStatus });
      if (!res.data.success) throw new Error(res.data.message || 'Status update failed');
      setTasks((current) => current.map((item) => (
        item._id === taskId ? res.data.data : item
      )));
      setMessage(`Task marked as ${STATUS_LABELS[newStatus].toLowerCase()}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setTasks((current) => current.map((item) => (
        item._id === taskId ? { ...item, status: previousStatus } : item
      )));
      setUpdateError(error.response?.data?.message || 'The status update failed. The card has been restored.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      const res = await api.post(`/housekeeping/tasks/${taskId}/accept`);
      setMessage(res.data.message || 'Task assignment accepted.');
      await fetchHousekeepingData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept task.');
    }
  };

  const handleRejectTask = async (event) => {
    event.preventDefault();
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionError('Enter a reason before rejecting this task.');
      return;
    }
    try {
      const res = await api.post(`/housekeeping/tasks/${selectedTask._id}/reject`, { reason });
      setMessage(res.data.message || 'Task rejection recorded.');
      setIsRejectOpen(false);
      setRejectionReason('');
      setRejectionError('');
      await fetchHousekeepingData();
    } catch (err) {
      setRejectionError(err.response?.data?.message || 'Failed to reject task.');
    }
  };

  const handleReassignTask = async (taskId) => {
    try {
      const assignedTo = reassignmentSelections[taskId];
      if (!assignedTo) return;
      const res = await api.post(`/housekeeping/tasks/${taskId}/assign`, { assignedTo });
      setMessage(res.data.message || 'Task reassigned.');
      await fetchHousekeepingData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign task.');
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
    (task) => statusFilter === 'all' || task.status === statusFilter
  );

  const handleDragStart = (event, task) => {
    if (task.status === 'inspected' || task.status === 'rejected' || updatingTaskId) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/task-id', task._id);
  };

  const handleDrop = (event, status) => {
    event.preventDefault();
    setDragOverStatus(null);
    const taskId = event.dataTransfer.getData('text/task-id');
    if (taskId) handleUpdateStatus(taskId, status);
  };

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

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3">
        <label htmlFor="housekeeping-status-filter" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5" /> Filter Queue
        </label>
        <select
          id="housekeeping-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 max-w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
        >
          <option value="all">All</option>
          {STATUS_COLUMNS.map((column) => (
            <option key={column.id} value={column.id}>{column.label}</option>
          ))}
        </select>
      </div>

      {dataError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {dataError}
          <button type="button" onClick={fetchHousekeepingData} className="ml-2 underline">Retry</button>
        </div>
      )}
      {updateError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {updateError}
        </div>
      )}

      {/* Responsive Kanban Queue */}
      {loading ? (
        <LoadingSpinner text="Retrieving housekeeping queue..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((task) => (
              task.status === column.id || (task.status === 'rejected' && column.id === 'dirty')
            ));
            const StatusIcon = column.icon;

            return (
              <section
                key={column.id}
                aria-label={`${column.label} tasks`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStatus(column.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus(null);
                }}
                onDrop={(event) => handleDrop(event, column.id)}
                className={`min-w-0 rounded-2xl border p-2.5 transition-colors ${
                  dragOverStatus === column.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200/80 bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between px-1 pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4 text-slate-500" />
                    <h2 className="text-xs font-black uppercase tracking-wide text-slate-700">{column.label}</h2>
                  </div>
                  <span className="min-w-6 rounded-full bg-white px-2 py-0.5 text-center text-xs font-bold text-slate-600 shadow-sm">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => {
                    const nextStatus = NEXT_STATUS[task.status];
                    const isUpdating = updatingTaskId === task._id;
                    const isMovable = Boolean(nextStatus)
                      && !isUpdating
                      && (task.assignmentStatus === 'accepted' || user?.role !== 'housekeeping_staff');

                    return (
                      <div
                        key={task._id}
                        draggable={isMovable}
                        onDragStart={(event) => handleDragStart(event, task)}
                        className={`transition-opacity ${isMovable ? 'cursor-grab active:cursor-grabbing' : ''} ${isUpdating ? 'opacity-60' : ''}`}
                      >
                        <Card className="h-full border-slate-200 hover:border-brand-300">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-300" />
                                <span className="text-lg font-black leading-tight text-slate-900">
                                  Room #{task.roomId?.roomNumber || 'Room'}
                                </span>
                              </div>
                              <span className="mt-1 block pl-5 text-[11px] text-slate-400">
                                Floor {task.roomId?.floor || '1'} • {task.taskType.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={task.priority}>{task.priority}</Badge>
                              {task.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-700">Assigned Attendant:</span>{' '}
                              {task.assignedTo?.name || 'Unassigned'}
                            </p>
                            {task.notes && (
                              <p className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-500">
                                {task.notes}
                              </p>
                            )}
                            {task.damageReported && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                                <span className="font-bold">Damage Reported:</span> {task.damageDescription}
                              </div>
                            )}
                            {task.rejectionReason && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                                <span className="font-bold">Rejection reason:</span> {task.rejectionReason}
                              </div>
                            )}
                            {task.assignmentHistory?.length > 0 && (
                              <div className="pt-1 text-[10px] text-slate-500">
                                <span className="font-semibold">Assignment history:</span>{' '}
                                {task.assignmentHistory.map((entry) => (
                                  `${entry.action}${entry.reason ? `: ${entry.reason}` : ''}`
                                )).join(' → ')}
                              </div>
                            )}
                          </div>

                          {isUpdating && (
                            <p className="mt-3 text-[11px] font-semibold text-brand-600">Saving status…</p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDamageOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" /> Report Damage
                            </button>

                            {task.status === 'rejected'
                              ? ['hotel_admin', 'receptionist'].includes(user?.role) && (
                                <div className="flex w-full items-center gap-1">
                                  <select
                                    aria-label={`Reassign room ${task.roomId?.roomNumber || ''}`}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                                    value={reassignmentSelections[task._id] || ''}
                                    onChange={(event) => setReassignmentSelections({
                                      ...reassignmentSelections,
                                      [task._id]: event.target.value
                                    })}
                                  >
                                    <option value="">Choose attendant</option>
                                    {staff.map((employee) => (
                                      <option key={employee.userId?._id} value={employee.userId?._id}>
                                        {employee.userId?.name}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    disabled={!reassignmentSelections[task._id]}
                                    onClick={() => handleReassignTask(task._id)}
                                  >
                                    Reassign
                                  </Button>
                                </div>
                              )
                              : (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  {user?.role === 'housekeeping_staff'
                                    && task.assignmentStatus !== 'accepted'
                                    && task.status !== 'rejected'
                                    && !['clean', 'inspected'].includes(task.status) && (
                                      <>
                                        <Button size="sm" variant="success" onClick={() => handleAcceptTask(task._id)}>Accept</Button>
                                        <Button
                                          size="sm"
                                          variant="danger"
                                          onClick={() => {
                                            setSelectedTask(task);
                                            setRejectionReason('');
                                            setRejectionError('');
                                            setIsRejectOpen(true);
                                          }}
                                        >Reject</Button>
                                      </>
                                    )}
                                  {nextStatus && isMovable && (
                                    <Button
                                      size="sm"
                                      variant={task.status === 'clean' ? 'gold' : task.status === 'dirty' ? 'primary' : 'success'}
                                      icon={task.status === 'clean' ? ShieldCheck : task.status === 'dirty' ? Play : Check}
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateStatus(task._id, nextStatus)}
                                      className="hidden sm:inline-flex"
                                    >
                                      {task.status === 'dirty' ? 'Start' : task.status === 'cleaning_in_progress' ? 'Mark Clean' : 'Inspect & Pass'}
                                    </Button>
                                  )}
                                  {nextStatus && (
                                    <label className="flex items-center gap-1.5 sm:hidden">
                                      <span className="sr-only">Move room {task.roomId?.roomNumber}</span>
                                      <select
                                        value=""
                                        disabled={!isMovable}
                                        onChange={(event) => {
                                          if (event.target.value) handleUpdateStatus(task._id, event.target.value);
                                        }}
                                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                                      >
                                        <option value="">Move to…</option>
                                        <option value={nextStatus}>{STATUS_LABELS[nextStatus]}</option>
                                      </select>
                                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                    </label>
                                  )}
                                </div>
                              )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-[11px] text-slate-400">
                      No rooms
                    </div>
                  )}
                </div>
              </section>
            );
          })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Cleaning Task"
        subtitle={`Room #${selectedTask?.roomId?.roomNumber || ''}`}
      >
        <form onSubmit={handleRejectTask} className="space-y-4">
          <Input
            label="Reason for rejection"
            required
            value={rejectionReason}
            onChange={(event) => {
              setRejectionReason(event.target.value);
              if (rejectionError) setRejectionError('');
            }}
            placeholder="Explain why you cannot accept this assignment"
          />
          {rejectionError && <p className="text-xs text-rose-600">{rejectionError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={!rejectionReason.trim()}>Reject Job</Button>
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
