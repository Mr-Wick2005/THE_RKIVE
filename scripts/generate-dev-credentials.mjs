import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CREDENTIALS_FILE = path.resolve(process.cwd(), '.dev-credentials.local');

function generateSecurePassword() {
  const bytes = crypto.randomBytes(18).toString('base64url');
  return `Dev!${bytes}#9`;
}

export function getOrCreateDevCredentials() {
  let superAdminPass;
  let deptAdminPass;

  if (fs.existsSync(CREDENTIALS_FILE)) {
    const content = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const saMatch = content.match(/SUPER_ADMIN_PASSWORD=([^\r\n]+)/);
    const daMatch = content.match(/DEPT_ADMIN_PASSWORD=([^\r\n]+)/);
    if (saMatch && daMatch) {
      superAdminPass = saMatch[1].trim();
      deptAdminPass = daMatch[1].trim();
    }
  }

  if (!superAdminPass) superAdminPass = generateSecurePassword();
  if (!deptAdminPass) deptAdminPass = generateSecurePassword();

  const fileContent = `# ==============================================================================
# THE RKIVE — LOCAL DEVELOPMENT TEST CREDENTIALS (GIT-IGNORED)
# Target Project: magazeen local (qbkibltrrheucxuvjxcw)
# Generated: ${new Date().toISOString()}
# DO NOT COMMIT OR EXPOSE THIS FILE
# ==============================================================================

# 1. Super Admin Account
SUPER_ADMIN_NAME="Local Test Super Admin"
SUPER_ADMIN_EMAIL=superadmin.test@magazeen.local
SUPER_ADMIN_PASSWORD=${superAdminPass}
SUPER_ADMIN_ROLE=SUPER_ADMIN

# 2. Department Admin Account
DEPT_ADMIN_NAME="Local Test Department Admin"
DEPT_ADMIN_EMAIL=departmentadmin.test@magazeen.local
DEPT_ADMIN_PASSWORD=${deptAdminPass}
DEPT_ADMIN_ROLE=DEPARTMENT_ADMIN
DEPT_ADMIN_DEPARTMENT_NAME="Demo Computer Engineering"
DEPT_ADMIN_DEPARTMENT_SHORT="CSE"
DEPT_ADMIN_DEPARTMENT_SLUG="demo-computer-engineering"
DEPT_ADMIN_DEPARTMENT_ID="d0000000-0000-0000-0000-000000000001"
`;

  fs.writeFileSync(CREDENTIALS_FILE, fileContent, { mode: 0o600 });

  return {
    superAdmin: {
      name: 'Local Test Super Admin',
      email: 'superadmin.test@magazeen.local',
      password: superAdminPass,
      role: 'SUPER_ADMIN',
    },
    deptAdmin: {
      name: 'Local Test Department Admin',
      email: 'departmentadmin.test@magazeen.local',
      password: deptAdminPass,
      role: 'DEPARTMENT_ADMIN',
      departmentId: 'd0000000-0000-0000-0000-000000000001',
      departmentName: 'Demo Computer Engineering',
      departmentSlug: 'demo-computer-engineering',
      departmentShort: 'CSE',
    },
  };
}

if (process.argv[1]?.endsWith('generate-dev-credentials.mjs')) {
  const creds = getOrCreateDevCredentials();
  console.log('Development credentials securely generated/loaded.');
  console.log(`Credentials saved to: ${CREDENTIALS_FILE}`);
  console.log(`Super Admin Email: ${creds.superAdmin.email}`);
  console.log(`Department Admin Email: ${creds.deptAdmin.email}`);
  console.log('Passwords saved securely to .dev-credentials.local (not printed).');
}
