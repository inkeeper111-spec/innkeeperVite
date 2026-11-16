import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, RotateCcw, Save, Search, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { DataSkeleton } from '../../components/ui/DataSkeleton';

const ACCESS_LEVELS = [
  { value: 'view_only', label: 'View only', description: 'Module is visible, but its records are not accessible.' },
  { value: 'read', label: 'Read', description: 'View module data without making changes.' },
  { value: 'write', label: 'Write', description: 'Read, create, and edit records. Deletion remains restricted.' }
];

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
  const getAccessLevel = (moduleKey) => {
    const view = isAllowed(`${moduleKey}.view`);
    const read = isAllowed(`${moduleKey}.read`) || (
      !Object.hasOwn(permissionOverrides, `${moduleKey}.read`) && view
    );
    if (!view) return 'none';
    if (isAllowed(`${moduleKey}.create`) || isAllowed(`${moduleKey}.update`)) return 'write';
    return read ? 'read' : 'view_only';
  };
  const setAccessLevel = (moduleKey, accessLevel) => {
    const permissions = {
      none: [],
      view_only: ['view'],
      read: ['view', 'read'],
      write: ['view', 'read', 'create', 'update']
    }[accessLevel];
    setPermissionOverrides((current) => {
      const next = { ...current };
      ['view', 'read', 'create', 'update', 'delete'].forEach((action) => {
        next[`${moduleKey}.${action}`] = permissions.includes(action);
      });
      return next;
    });
  };

  if (loading) return <DataSkeleton variant="page" rows={6} columns={5} label="Loading team permissions" />;

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

              <Card
                title="Module access"
                subtitle="Switch a module on to grant access, then choose its level. Changes take effect on the employee’s next request."
              >
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {settings.modules.map((module) => {
                    const accessLevel = getAccessLevel(module.key);
                    const enabled = accessLevel !== 'none';
                    const isCustom = ['view', 'read', 'create', 'update', 'delete']
                      .some((action) => Object.hasOwn(permissionOverrides, `${module.key}.${action}`));
                    const selectedLevel = ACCESS_LEVELS.find((level) => level.value === accessLevel);
                    return (
                      <article
                        key={module.key}
                        className={`min-w-0 rounded-2xl border p-4 transition ${
                          enabled
                            ? 'border-orvelle-border/80 bg-white shadow-sm'
                            : 'border-slate-200 bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`rounded-xl p-2.5 ${
                            enabled ? 'bg-orvelle-ivory text-orvelle-primary' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-bold text-orvelle-primary">{module.label}</h3>
                            {isCustom && (
                              <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                                Custom access
                              </span>
                            )}
                          </div>
                          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
                            <span className="sr-only">{enabled ? 'Disable' : 'Enable'} {module.label}</span>
                            <input
                              type="checkbox"
                              role="switch"
                              aria-label={`${enabled ? 'Disable' : 'Enable'} ${module.label}`}
                              checked={enabled}
                              disabled={saving}
                              onChange={() => setAccessLevel(module.key, enabled ? 'none' : 'read')}
                              className="peer sr-only"
                            />
                            <span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                          </label>
                        </div>
                        <div className="mt-4">
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor={`access-${module.key}`}>
                            Access level
                          </label>
                          <select
                            id={`access-${module.key}`}
                            aria-label={`${module.label} access level`}
                            value={accessLevel}
                            disabled={!enabled || saving}
                            onChange={(event) => setAccessLevel(module.key, event.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orvelle-amber focus:ring-2 focus:ring-orvelle-amber/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="none">Cannot view</option>
                            {ACCESS_LEVELS.map((level) => (
                              <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                          </select>
                          <p className="mt-2 min-h-8 text-xs leading-4 text-slate-500">
                            {selectedLevel?.description || 'This module is hidden and its API access is blocked.'}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
                  <strong>View only</strong> displays the module in navigation but blocks its records and actions.
                  <strong className="ml-1">Read</strong> opens module data without editing.
                  <strong className="ml-1">Write</strong> allows viewing, creating, and editing; deletes still require administrator access.
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
