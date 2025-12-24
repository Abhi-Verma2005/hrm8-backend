/**
 * Test Alert Matching Logic
 */

// Sample job
const job = {
    id: 'test-job-1',
    title: 'Senior React Developer',
    description: 'We are looking for a React developer',
    workArrangement: 'REMOTE',
    location: 'Remote',
    category: 'Engineering',
    employmentType: 'FULL_TIME'
};

// Sample alert criteria
const alertCriteria = {
    search: 'React',
    workArrangement: 'REMOTE'
};

// Matching logic (copied from CandidateJobService)
function jobMatchesAlert(job: any, criteria: any): boolean {
    console.log('\n🔍 Testing match:');
    console.log('Job:', {
        title: job.title,
        workArrangement: job.workArrangement,
        category: job.category
    });
    console.log('Criteria:', criteria);

    // If no criteria, match all jobs
    if (!criteria || Object.keys(criteria).length === 0) {
        console.log('✅ No criteria - matches all');
        return true;
    }

    // Check search keywords
    if (criteria.search) {
        const searchLower = criteria.search.toLowerCase();
        const titleMatch = job.title?.toLowerCase().includes(searchLower);
        const descMatch = job.description?.toLowerCase().includes(searchLower);

        console.log(`  Search "${criteria.search}":`, {
            titleMatch,
            descMatch,
            result: titleMatch || descMatch
        });

        if (!titleMatch && !descMatch) {
            console.log('❌ Search keyword not found');
            return false;
        }
    }

    // Check location
    if (criteria.location && job.location !== criteria.location) {
        console.log(`❌ Location mismatch: "${job.location}" !== "${criteria.location}"`);
        return false;
    }

    // Check employment type
    if (criteria.employmentType && job.employmentType !== criteria.employmentType) {
        console.log(`❌ Employment type mismatch: "${job.employmentType}" !== "${criteria.employmentType}"`);
        return false;
    }

    // Check work arrangement
    if (criteria.workArrangement && job.workArrangement !== criteria.workArrangement) {
        console.log(`❌ Work arrangement mismatch: "${job.workArrangement}" !== "${criteria.workArrangement}"`);
        return false;
    }

    // Check category
    if (criteria.category && job.category !== criteria.category) {
        console.log(`❌ Category mismatch: "${job.category}" !== "${criteria.category}"`);
        return false;
    }

    // Check department
    if (criteria.department && job.department !== criteria.department) {
        console.log(`❌ Department mismatch: "${job.department}" !== "${criteria.department}"`);
        return false;
    }

    // Check salary range
    if (criteria.salaryMin && job.salaryMax && job.salaryMax < criteria.salaryMin) {
        console.log(`❌ Salary too low: max ${job.salaryMax} < min ${criteria.salaryMin}`);
        return false;
    }

    if (criteria.salaryMax && job.salaryMin && job.salaryMin > criteria.salaryMax) {
        console.log(`❌ Salary too high: min ${job.salaryMin} > max ${criteria.salaryMax}`);
        return false;
    }

    console.log('✅ All criteria matched!');
    return true;
}

// Test 1: Should match
console.log('='.repeat(60));
console.log('TEST 1: Remote React job vs Remote React alert');
console.log('='.repeat(60));
const result1 = jobMatchesAlert(job, alertCriteria);
console.log(`\nResult: ${result1 ? '✅ MATCH' : '❌ NO MATCH'}\n`);

// Test 2: Should NOT match (wrong work arrangement)
console.log('='.repeat(60));
console.log('TEST 2: On-site React job vs Remote React alert');
console.log('='.repeat(60));
const job2 = { ...job, workArrangement: 'ON_SITE' };
const result2 = jobMatchesAlert(job2, alertCriteria);
console.log(`\nResult: ${result2 ? '✅ MATCH' : '❌ NO MATCH'}\n`);

// Test 3: Should NOT match (no React keyword)
console.log('='.repeat(60));
console.log('TEST 3: Remote Python job vs Remote React alert');
console.log('='.repeat(60));
const job3 = { ...job, title: 'Python Developer', description: 'Python backend developer' };
const result3 = jobMatchesAlert(job3, alertCriteria);
console.log(`\nResult: ${result3 ? '✅ MATCH' : '❌ NO MATCH'}\n`);

// Test 4: Your actual scenario
console.log('='.repeat(60));
console.log('TEST 4: Your actual job vs alert');
console.log('='.repeat(60));
const yourJob = {
    title: 'Senior React Developer',
    description: 'scacscsacsafdsaFdsfdsfdsfgsdgdsgdfsGfdgfGSDGASDGSADGASDFGSADFGASFD',
    workArrangement: 'ON_SITE', // This is what's in the database
    location: 'Remote',
    category: 'Engineering',
    employmentType: 'FULL_TIME'
};
const yourAlert = {
    search: 'React',
    workArrangement: 'ON_SITE'
};
const result4 = jobMatchesAlert(yourJob, yourAlert);
console.log(`\nResult: ${result4 ? '✅ MATCH' : '❌ NO MATCH'}\n`);
