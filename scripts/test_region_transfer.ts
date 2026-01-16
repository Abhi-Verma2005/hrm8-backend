import { RegionService } from '../src/services/hrm8/RegionService';
import { prisma } from '../src/lib/prisma';

// Mock specific IDs for testing - Replace with real IDs from your DB if running against dev DB
// Or create test data
async function testRegionTransfer() {
    console.log('--- Starting Region Transfer Test ---');

    // 1. Setup Test Data
    console.log('Creating test region and entities...');
    const licensee1 = await prisma.regionalLicensee.create({
        data: {
            name: 'Licensee One',
            legal_entity_name: 'Prop Co 1',
            email: 'l1@test.com',
            manager_contact: 'Manager 1',
            revenue_share_percent: 10,
            agreement_start_date: new Date()
        }
    });

    const licensee2 = await prisma.regionalLicensee.create({
        data: {
            name: 'Licensee Two',
            legal_entity_name: 'Prop Co 2',
            email: 'l2@test.com',
            manager_contact: 'Manager 2',
            revenue_share_percent: 12,
            agreement_start_date: new Date()
        }
    });

    if (!licensee1 || !licensee2) {
        console.error('Licensee creation failed');
        return;
    }

    const region = await prisma.region.create({
        data: {
            name: 'Test Transfer Region ' + Date.now(),
            code: 'TR-' + Date.now(),
            country: 'TestLand',
            licensee_id: licensee1.id,
            owner_type: 'LICENSEE'
        }
    });

    // Create entities in this region
    await prisma.company.create({
        data: {
            name: 'Test Company in Region',
            domain: 'test-region-company-' + Date.now() + '.com',
            website: 'https://test.com',
            region_id: region.id
        }
    });

    // 2. Get Transfer Impact
    console.log('Testing getTransferImpact...');
    const impact = await RegionService.getTransferImpact(region.id);
    console.log('Impact Analysis:', impact);

    if ('error' in impact) {
        console.error('Impact analysis failed');
        return;
    }

    if (impact.companies !== 1) {
        console.error('FAILED: Update impact count for companies. Expected 1, got', impact.companies);
    } else {
        console.log('PASSED: Company count correct');
    }

    // 3. Perform Transfer
    console.log(`Transferring region ${region.id} from ${licensee1.id} to ${licensee2.id}...`);
    const transferResult = await RegionService.transferOwnership(region.id, licensee2.id, {
        auditNote: 'Automated Test Transfer',
        performedBy: 'TestScript'
    });

    if ('error' in transferResult) {
        console.error('Transfer failed:', transferResult.error);
    } else {
        console.log('Transfer successful:', transferResult.transferredCounts);

        // Verify owner updated
        const updatedRegion = await prisma.region.findUnique({ where: { id: region.id } });
        if (updatedRegion?.licensee_id === licensee2.id) {
            console.log('PASSED: Region owner updated correctly');
        } else {
            console.error('FAILED: Region owner not updated');
        }
    }

    // Cleanup
    console.log('Cleaning up...');
    await prisma.region.delete({ where: { id: region.id } });
    await prisma.regionalLicensee.deleteMany({ where: { id: { in: [licensee1.id, licensee2.id] } } });
    console.log('Done.');
}

testRegionTransfer()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
