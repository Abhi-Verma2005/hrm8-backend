// Quick test to check if the route is being registered
import express from 'express';
const app = express();

// Simulate our route structure
const companyRouter = express.Router();

// Add authenticate middleware placeholder
companyRouter.use((req, res, next) => {
    console.log('Auth middleware hit');
    next();
});

// Transaction routes
companyRouter.get('/transactions', (req, res) => {
    console.log('Transaction route hit!');
    res.json({ message: 'Transactions endpoint works!' });
});

app.use('/api/companies', companyRouter);

app.listen(3001, () => {
    console.log('Test server on 3001');
    console.log('Try: curl http://localhost:3001/api/companies/transactions');
});
