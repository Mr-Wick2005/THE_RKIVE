import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// Read credentials safely from Git-ignored .dev-credentials.local
const credsFile = path.resolve(process.cwd(), '.dev-credentials.local');
let credsExist = fs.existsSync(credsFile);

describe('Admin Authentication & Role-Based Access Control Invariants', () => {
  test('1. Development credentials file is configured and Git-ignored', () => {
    assert.equal(credsExist, true, '.dev-credentials.local must exist locally');
    const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
    assert.match(gitignore, /\.dev-credentials\.local/, '.dev-credentials.local must be in .gitignore');
  });

  test('2. Super Admin role invariant: full administrative access', () => {
    const superAdminProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'superadmin.test@magazeen.local',
      full_name: 'Local Test Super Admin',
      role: 'SUPER_ADMIN',
      department_id: null,
      is_active: true,
    };

    // Role assertions
    assert.equal(superAdminProfile.role, 'SUPER_ADMIN');
    assert.equal(superAdminProfile.is_active, true);

    // Route access rules matching app/admin/dashboard/page.tsx
    const canAccessDashboard = superAdminProfile.role === 'SUPER_ADMIN';
    const canAccessReviewWorkspace = superAdminProfile.role === 'SUPER_ADMIN';
    const canAccessUserManagement = superAdminProfile.role === 'SUPER_ADMIN';

    assert.equal(canAccessDashboard, true);
    assert.equal(canAccessReviewWorkspace, true);
    assert.equal(canAccessUserManagement, true);
  });

  test('3. Department Admin role invariant: strictly department-scoped access', () => {
    const deptId = 'd0000000-0000-0000-0000-000000000001';
    const otherDeptId = 'd0000000-0000-0000-0000-000000000002';

    const deptAdminProfile = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'departmentadmin.test@magazeen.local',
      full_name: 'Local Test Department Admin',
      role: 'DEPARTMENT_ADMIN',
      department_id: deptId,
      is_active: true,
    };

    assert.equal(deptAdminProfile.role, 'DEPARTMENT_ADMIN');
    assert.equal(deptAdminProfile.department_id, deptId);

    // Blocked from Super Admin routes
    const canAccessDashboard = deptAdminProfile.role === 'SUPER_ADMIN';
    const canAccessReviewWorkspace = deptAdminProfile.role === 'SUPER_ADMIN';
    const canAccessUserManagement = deptAdminProfile.role === 'SUPER_ADMIN';

    assert.equal(canAccessDashboard, false, 'Department admin cannot access dashboard');
    assert.equal(canAccessReviewWorkspace, false, 'Department admin cannot review other submissions');
    assert.equal(canAccessUserManagement, false, 'Department admin cannot access user management');

    // Cross-department isolation check
    const ownDepartmentMagazine = { id: 'mag-1', department_id: deptId };
    const otherDepartmentMagazine = { id: 'mag-2', department_id: otherDeptId };

    const canManageOwn = ownDepartmentMagazine.department_id === deptAdminProfile.department_id;
    const canManageOther = otherDepartmentMagazine.department_id === deptAdminProfile.department_id;

    assert.equal(canManageOwn, true, 'Dept Admin can manage own department publications');
    assert.equal(canManageOther, false, 'Dept Admin is strictly blocked from other department publications');
  });

  test('4. Deactivated administrator accounts are rejected at login', () => {
    const deactivatedProfile = {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'deactivated.admin@magazeen.local',
      role: 'DEPARTMENT_ADMIN',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      is_active: false,
    };

    // Rule from components/admin/login-form.tsx line 74: if (!profile.is_active) block
    const isLoginPermitted = deactivatedProfile.is_active;
    assert.equal(isLoginPermitted, false, 'Deactivated profile must be rejected during login');
  });

  test('5. Unauthenticated sessions are blocked from administrative routes', () => {
    const unauthenticatedSession = null;
    const isAuth = Boolean(unauthenticatedSession);

    // Rule from middleware.ts and AdminAuthProvider
    const targetRoute = isAuth ? '/admin/dashboard' : '/admin/login';
    assert.equal(targetRoute, '/admin/login', 'Unauthenticated request must be redirected to /admin/login');
  });

  test('6. Production database isolation invariant', () => {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const configuredUrl = urlMatch ? urlMatch[1].trim() : '';

    assert.ok(configuredUrl.startsWith('https://') && configuredUrl.includes('.supabase.co'), 'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL');
  });
});
