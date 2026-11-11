import { PaginatedTable } from '../../components/ui/PaginatedTable';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, RotateCcw, Save, Search, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete'
};

const roleLabel = (role) => role?.replace(/_/g, ' ');

export const RolesResponsibilitiesPage = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissionOverrides, setPermissionOverrides] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await api.get('/staff/permissions');
        const data = response.data.data;
        setSettings(data);
        const firstUser = data.users[0];
        if (firstUser) {
          setSelectedUserId(firstUser.id);
          setPermissionOverrides(firstUser.permissionOverrides || {});
        }
      } catch (error) {
        console.error('Failed to load user permissions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const selectedUser = settings?.users.find((user) => user.id === selectedUserId);
  const visibleUsers = useMemo(() => (
    (settings?.users || []).filter((user) => (
      `${user.name} ${user.email} ${user.role} ${user.department || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ))
  ), [search, settings?.users]);

  const getDefault = (permissionKey) => Boolean(
    settings?.roleDefaults?.[selectedUser?.role]?.[permissionKey]
  );
  const isAllowed = (permissionKey) => (
    Object.hasOwn(permissionOverrides, permissionKey)
      ? permissionOverrides[permissionKey]
      : getDefault(permissionKey)
  );

  const togglePermission = (permissionKey) => {
    setPermissionOverrides((current) => ({
      ...current,
      [permissionKey]: !(
        Object.hasOwn(current, permissionKey)
          ? current[permissionKey]
          : getDefault(permissionKey)
      )
    }));
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const response = await api.put(
        `/staff/${selectedUser.id}/permissions`,
        { permissionOverrides },
        { skipSuccessToast: true }
      );
      setSettings((current) => ({
        ...current,
        users: current.users.map((user) => (
          user.id === selectedUser.id
            ? { ...user, permissionOverrides: response.data.data.permissionOverrides }
            : user
        ))
      }));
      setPermissionOverrides(response.data.data.permissionOverrides);
      showToast?.('success', response.data.message || 'Permissions saved.');
    } catch (error) {
      console.error('Failed to save user permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetPermissions = () => {
    setPermissionOverrides({});
  };

  if (loading) return <LoadingSpinner text="Loading team permissions..." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orvelle-amber">
            <ShieldCheck className="h-4 w-4" />
            Team access control
          </div>
          <h1 className="text-2xl font-black tracking-tight text-orvelle-primary">Roles &amp; Responsibilities</h1>
          <p className="mt-1 text-sm text-orvelle-muted">
            Manage permissions for each team member. Role defaults apply until you set a personal override.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button className="w-full sm:w-auto" type="button" variant="outline" icon={RotateCcw} onClick={resetPermissions} disabled={!selectedUser || saving}>
            Reset to defaults
          </Button>
          <Button className="w-full sm:w-auto" type="button" variant="primary" icon={Save} onClick={savePermissions} disabled={!selectedUser || saving}>
            {saving ? 'Saving...' : 'Save permissions'}
          </Button>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="h-fit !p-0">
          <div className="border-b border-orvelle-border/70 p-4">
            <h2 className="font-bold text-orvelle-primary">Team members</h2>
            <p className="mt-1 text-xs text-orvelle-muted">{settings?.users.length || 0} staff accounts</p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orvelle-muted" />
              <Input
                aria-label="Search team members"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or role"
                className="pl-9"
              />
            </div>
          </div>
          <div className="max-h-[36rem] overflow-y-auto p-2">
            {visibleUsers.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-orvelle-muted">No team members found.</p>
            ) : visibleUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={saving}
                onClick={() => {
                  setSelectedUserId(user.id);
                  setPermissionOverrides(user.permissionOverrides || {});
                }}
                className={`mb-1 flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${
                  selectedUserId === user.id
                    ? 'border-orvelle-amber bg-orvelle-ivory'
                    : 'border-transparent hover:bg-orvelle-ivory/70'
                }`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-orvelle-cream text-orvelle-primary">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-orvelle-primary">{user.name}</span>
                  <span className="block truncate text-xs capitalize text-orvelle-muted">{roleLabel(user.role)}</span>
                </span>
                {!user.isActive && (
                  <span className="text-[10px] font-bold uppercase text-rose-600">Inactive</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        <section className="min-w-0 space-y-4">
          {!selectedUser ? (
            <Card className="py-16 text-center text-sm text-orvelle-muted">
              Add staff accounts to manage their permissions here.
            </Card>
          ) : (
            <>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-orvelle-primary">{selectedUser.name}</p>
                  <p className="mt-0.5 break-words text-sm text-orvelle-muted">
                    {selectedUser.email} <span className="mx-1.5">·</span>
                    <span className="capitalize">{roleLabel(selectedUser.role)}</span>
                    {selectedUser.department && <span> <span className="mx-1.5">·</span>{roleLabel(selectedUser.department)}</span>}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 border border-orvelle-border/70 bg-orvelle-ivory px-3 py-2 text-xs font-semibold text-orvelle-primary">
                  <KeyRound className="h-3.5 w-3.5 text-orvelle-amber" />
                  Defaults with personal overrides
                </span>
              </Card>

              <Card className="!p-0">
                <div className="overflow-x-auto">
                  <PaginatedTable tableClassName="w-full min-w-[42rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-orvelle-border/70 bg-orvelle-ivory/70 text-[11px] font-bold uppercase tracking-wider text-orvelle-muted">
                        <th className="px-5 py-3.5">Module</th>
                        {settings.actions.map((action) => (
                          <th key={action} className="px-3 py-3.5 text-center">{ACTION_LABELS[action] || action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orvelle-border/50">
                      {settings.modules.map((module) => (
                        <tr key={module.key} className="hover:bg-orvelle-ivory/40">
                          <th scope="row" className="px-5 py-3.5 font-semibold text-orvelle-primary">{module.label}</th>
                          {settings.actions.map((action) => {
                            const key = `${module.key}.${action}`;
                            const isCustom = Object.hasOwn(permissionOverrides, key);
                            return (
                              <td key={key} className="px-3 py-3.5 text-center">
                                <label className="inline-flex cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    aria-label={`${ACTION_LABELS[action]} ${module.label}`}
                                    checked={isAllowed(key)}
                                    onChange={() => togglePermission(key)}
                                    className="h-4 w-4 cursor-pointer accent-orvelle-amber"
                                  />
                                </label>
                                {isCustom && (
                                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-orvelle-amber">
                                    Custom
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </PaginatedTable>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orvelle-border/60 px-5 py-3 text-xs text-orvelle-muted">
                  <span><Check className="mr-1 inline h-3.5 w-3.5 text-orvelle-success" />Checked permissions are allowed.</span>
                  <span>Permissions are enforced immediately; a page refresh updates navigation.</span>
                </div>
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default RolesResponsibilitiesPage;
