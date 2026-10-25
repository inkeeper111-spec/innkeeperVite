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
  Wrench,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert
} from 'lucide-react';
import dayjs from 'dayjs';

export const MaintenancePage = () => {
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    roomId: '',
    equipmentName: '',
    category: 'plumbing',
    issueDescription: '',
    priority: 'medium',
    assignedTechnician: '',
    estimatedCost: 0,
    takesRoomOutOfService: false
  });

  const [message, setMessage] = useState('');

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const [tRes, rRes, sRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/rooms'),
        api.get('/staff')
      ]);
      if (tRes.data.success) setTickets(tRes.data.data);
      if (rRes.data.success) setRooms(rRes.data.data);
      if (sRes.data.success) setStaff(sRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/maintenance', ticketForm);
      if (res.data.success) {
        setIsNewTicketOpen(false);
        setMessage('Maintenance ticket logged successfully.');
        setTicketForm({
          roomId: '',
          equipmentName: '',
          category: 'plumbing',
          issueDescription: '',
          priority: 'medium',
          assignedTechnician: '',
          estimatedCost: 0,
          takesRoomOutOfService: false
        });
        fetchMaintenance();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await api.put(`/maintenance/${ticketId}`, { status: newStatus });
      if (res.data.success) {
        setMessage(`Ticket marked as ${newStatus}.`);
        fetchMaintenance();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert('Failed to update ticket status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Facility Maintenance & Repairs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Work orders, equipment repairs, room safety shutdowns, and technician assignments
          </p>
        </div>

        <Button variant="primary" icon={PlusCircle} onClick={() => setIsNewTicketOpen(true)}>
          Log Repair Ticket
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tickets List */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving maintenance tickets..." />
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No maintenance tickets open. All hotel facilities operational.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Ticket #</th>
                  <th className="pb-3">Location / Equipment</th>
                  <th className="pb-3">Issue Description</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Assigned Tech</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold font-mono text-slate-900">{t.ticketNumber}</td>
                    <td className="py-3.5 font-semibold text-slate-800">
                      {t.roomId ? `Room ${t.roomNumber}` : t.equipmentName || 'Facility Area'}
                    </td>
                    <td className="py-3.5 text-slate-700 font-medium max-w-xs">
                      {t.issueDescription}
                      {t.takesRoomOutOfService && (
                        <span className="block text-[10px] text-rose-600 font-bold uppercase mt-0.5">
                          Room Taken Out Of Service
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={t.priority}>{t.priority}</Badge>
                    </td>
                    <td className="py-3.5 text-slate-600">{t.assignedTechnician?.name || 'Unassigned'}</td>
                    <td className="py-3.5">
                      <Badge variant={t.status}>{t.status}</Badge>
                    </td>
                    <td className="py-3.5 text-right space-x-1.5">
                      {t.status === 'open' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateStatus(t._id, 'in_progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {t.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleUpdateStatus(t._id, 'resolved')}
                        >
                          Resolve
                        </Button>
                      )}
                      {t.status === 'resolved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(t._id, 'closed')}
                        >
                          Close Ticket
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Maintenance Ticket Modal */}
      <Modal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        title="Open Repair Ticket"
        subtitle="Log equipment failure or room service breakdown"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Room Location"
              value={ticketForm.roomId}
              onChange={(e) => setTicketForm({ ...ticketForm, roomId: e.target.value })}
            >
              <option value="">-- Facility / Common Area --</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  Room #{r.roomNumber} (Floor {r.floor})
                </option>
              ))}
            </Select>

            <Input
              label="Equipment Name (if common area)"
              value={ticketForm.equipmentName}
              onChange={(e) => setTicketForm({ ...ticketForm, equipmentName: e.target.value })}
              placeholder="Elevator #2, Pool Pump, Lobby AC"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Issue Category"
              value={ticketForm.category}
              onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
              options={[
                { label: 'Plumbing & Drainage', value: 'plumbing' },
                { label: 'Electrical & Lighting', value: 'electrical' },
                { label: 'HVAC Air Conditioning & Heating', value: 'hvac' },
                { label: 'Carpentry & Furniture', value: 'carpentry' },
                { label: 'Smart TV & Appliances', value: 'appliances' },
                { label: 'Painting & Drywall', value: 'painting' },
                { label: 'Other Facility Repair', value: 'other' }
              ]}
            />

            <Select
              label="Urgency Level"
              value={ticketForm.priority}
              onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High Priority', value: 'high' },
                { label: 'Critical Emergency', value: 'critical' }
              ]}
            />
          </div>

          <Input
            label="Detailed Issue Description"
            required
            value={ticketForm.issueDescription}
            onChange={(e) => setTicketForm({ ...ticketForm, issueDescription: e.target.value })}
            placeholder="e.g. Toilet tank filling valve leaking continuously, water pressure low"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assign Technician"
              value={ticketForm.assignedTechnician}
              onChange={(e) => setTicketForm({ ...ticketForm, assignedTechnician: e.target.value })}
            >
              <option value="">-- Unassigned (Dispatch Queue) --</option>
              {staff.map((s) => (
                <option key={s.userId?._id} value={s.userId?._id}>
                  {s.userId?.name} ({s.designation})
                </option>
              ))}
            </Select>

            <Input
              label="Estimated Cost ($)"
              type="number"
              value={ticketForm.estimatedCost}
              onChange={(e) => setTicketForm({ ...ticketForm, estimatedCost: e.target.value })}
            />
          </div>

          {ticketForm.roomId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <input
                type="checkbox"
                id="outOfServiceCheck"
                checked={ticketForm.takesRoomOutOfService}
                onChange={(e) => setTicketForm({ ...ticketForm, takesRoomOutOfService: e.target.checked })}
                className="rounded border-slate-300 text-brand-600"
              />
              <label htmlFor="outOfServiceCheck" className="text-xs text-amber-900 font-semibold">
                Take Room Out Of Service (prevents reservation booking until fixed)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsNewTicketOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Log Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

