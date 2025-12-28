const db = require('./lib/db');

async function verify() {
    console.log('--- Verifying Admin Fixes ---');

    // 1. Test getAdminEmails (should return default admin)
    console.log('\n1. Testing getAdminEmails...');
    const admins = await db.getAdminEmails();
    console.log('Admins:', admins);

    const defaultAdmin = 'dalinnatasha6@gmail.com';
    if (admins.includes(defaultAdmin)) {
        console.log('✅ Default admin is present.');
    } else {
        console.error('❌ Default admin is MISSING!');
    }

    // 2. Test addAdminEmail
    console.log('\n2. Testing addAdminEmail...');
    const newAdmin = 'testadmin@example.com';
    const added = await db.addAdminEmail(newAdmin);
    console.log('Add result:', added);

    const adminsAfter = await db.getAdminEmails();
    console.log('Admins after add:', adminsAfter);

    if (adminsAfter.includes(newAdmin)) {
        console.log('✅ New admin added successfully.');
    } else {
        console.error('❌ Failed to add new admin.');
    }

    // 3. Test duplicate add
    console.log('\n3. Testing duplicate add...');
    const addedAgain = await db.addAdminEmail(newAdmin);
    console.log('Duplicate add result:', addedAgain);

    if (addedAgain) {
        console.log('✅ Duplicate add handled correctly (returns true).');
    } else {
        console.error('❌ Duplicate add failed.');
    }
}

verify().catch(console.error);
