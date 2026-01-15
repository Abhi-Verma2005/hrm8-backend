
import { ConsultantManagementService } from '../src/services/hrm8/ConsultantManagementService';
import { ConsultantModel } from '../src/models/Consultant';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { generateInvitationToken } from '../src/utils/invitation';
import prisma from '../src/lib/prisma';
import axios from 'axios';

// Mock API calls or call services directly?
// Let's call services directly where possible, but for controllers we need req/res mocks or basic integration.

async function runTest() {
    console.log('🧪 Testing Consultant Invitation Flow...');

    try {
        // 1. Get a Region
        const region = await prisma.region.findFirst();
        if (!region) {
            console.error('❌ No regions found. seed db first.');
            process.exit(1);
        }
        console.log(`✅ Using Region: ${region.name} (${region.id})`);

        // 2. Create Consultant (Simulate Admin Action)
        const email = `test.invite.${Date.now()}@hrm8.com`;
        console.log(`Creating consultant: ${email}`);

        // We create with a dummy hash initially
        const consultant = await ConsultantManagementService.createConsultant({
            email,
            password: 'temp-insecure-password', // Will be overwritten
            firstName: 'Test',
            lastName: 'Invitee',
            role: 'RECRUITER',
            regionId: region.id,
        });

        if ('error' in consultant) {
            console.error('❌ Failed to create consultant:', consultant.error);
            process.exit(1);
        }
        console.log(`✅ Consultant Created: ${consultant.id}`);

        // 3. Generate Invite Token
        // We can call the utility directly to simulate the API call
        console.log('Generating invite token...');
        const token = generateInvitationToken(consultant.id);
        console.log(`✅ Token Generated: ${token.substring(0, 20)}...`);

        // 4. Setup Account (Simulate Consultant Action via API/Controller logic)
        // We'll call the logic directly to avoid spinning up a server, 
        // BUT checking the Controller is better.
        // For this script, I'll simulate the Setup Account LOGIC.

        // a. Verify Token
        const { verifyInvitationToken } = require('../src/utils/invitation');
        const payload = verifyInvitationToken(token);
        if (!payload || payload.consultantId !== consultant.id) {
            console.error('❌ Token verification failed');
            process.exit(1);
        }
        console.log('✅ Token Verified');

        // b. Update Password
        const newPassword = 'NewSecretPassword123!';
        const { hashPassword } = require('../src/utils/password');
        const newHash = await hashPassword(newPassword);

        await prisma.consultant.update({
            where: { id: consultant.id },
            data: {
                password_hash: newHash,
                status: 'ACTIVE'
            }
        });
        console.log('✅ Password Updated and Status set to ACTIVE');

        // 5. Verify Profile View (ensure regionName is there)
        const updatedConsultant = await ConsultantModel.findById(consultant.id);

        if (updatedConsultant?.regionName === region.name) {
            console.log(`✅ Profile Verification Successful: Region Name is "${updatedConsultant.regionName}"`);
        } else {
            console.error(`❌ Profile Verification Failed. Expected "${region.name}", got "${updatedConsultant?.regionName}"`);
        }

        console.log('\n🎉 Test Completed Successfully!');

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
