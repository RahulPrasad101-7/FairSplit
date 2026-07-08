// Initialize data safely from LocalStorage
let expenses = JSON.parse(localStorage.getItem('roommateExpenses')) || [];

// Grab all required DOM elements
const billForm = document.getElementById('bill-form');
const billName = document.getElementById('bill-name');
const billAmount = document.getElementById('bill-amount');
const billMembers = document.getElementById('bill-members');
const billPayer = document.getElementById('bill-payer');
const expenseList = document.getElementById('expense-list');
const balancesContainer = document.getElementById('balances-container');

// NAVIGATION ROUTER (Switches between the 3 pages)
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// CALCULATE STATUS BALANCES
function updateBalances() {
    let balances = {};

    expenses.forEach(expense => {
        const total = parseFloat(expense.amount);
        const payer = (expense.payer || "").trim();
        
        if (!payer || isNaN(total)) return;

        // Check if this transaction is a debt settlement
        if (expense.isSettlement) {
            const receiver = (expense.receiver || "").trim();
            if (!receiver) return;

            if (!balances[payer]) balances[payer] = 0;
            if (!balances[receiver]) balances[receiver] = 0;

            balances[payer] += total;
            balances[receiver] -= total;
            
            return; // Skip the regular splitting logic below
        }

        // Regular Bill Splitting Logic
        const membersList = (expense.members || "").split(',').map(name => name.trim()).filter(name => name !== "");
        if (membersList.length === 0) return;
        const share = total / membersList.length;

        if (!balances[payer]) balances[payer] = 0;

        membersList.forEach(member => {
            if (!balances[member]) balances[member] = 0;
            if (member === payer) {
                balances[member] += (total - share);
            } else {
                balances[member] -= share;
            }
        });
    });

    balancesContainer.innerHTML = '';
    const keys = Object.keys(balances);
    
    if (keys.length === 0) {
        balancesContainer.innerHTML = '<p class="neutral">No transactions recorded yet. Status is clear!</p>';
        return;
    }

    keys.forEach(name => {
        const bal = balances[name];
        if (Math.abs(bal) < 0.01) return; // Skip showing $0 balance
        
        const isOwed = bal >= 0;
        const statusClass = isOwed ? 'positive' : 'negative';
        const statusText = isOwed ? `is owed $${bal.toFixed(2)}` : `owes $${Math.abs(bal).toFixed(2)}`;
        
        const payButtonHTML = !isOwed 
            ? `<button class="pay-btn" onclick="settleDebt('${name}', ${Math.abs(bal)})">Pay Debt</button>` 
            : '';

        balancesContainer.innerHTML += `
            <div class="balance-card ${statusClass}">
                <div class="balance-info">
                    <strong>${name}</strong> ${statusText}
                </div>
                ${payButtonHTML}
            </div>
        `;
    });
}

// RENDER TRANSACTION HISTORY
function renderExpenses() {
    if (!expenseList) return;
    expenseList.innerHTML = '';
    
    if (expenses.length === 0) {
        expenseList.innerHTML = '<li class="neutral">No transactions found.</li>';
        return;
    }

    expenses.forEach((expense, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${expense.name}</strong> - $${parseFloat(expense.amount).toFixed(2)}<br>
                <small>${expense.isSettlement ? 'Settlement' : `Paid by ${expense.payer} | Split among: ${expense.members}`}</small>
            </div>
            <button class="delete-btn" onclick="deleteExpense(${index})">Delete</button>
        `;
        expenseList.appendChild(li);
    });
}

// HANDLE NEW BILL FORM SUBMISSION
if (billForm) {
    billForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newExpense = {
            name: billName.value,
            amount: billAmount.value,
            members: billMembers.value,
            payer: billPayer.value,
            isSettlement: false
        };

        expenses.push(newExpense);
        localStorage.setItem('roommateExpenses', JSON.stringify(expenses));

        billName.value = '';
        billAmount.value = '';
        billMembers.value = '';
        billPayer.value = '';

        updateBalances();
        renderExpenses();
        
        alert("Bill split successfully!");
    });
}

// SETTLE DEBT FUNCTION
window.settleDebt = function(debtorName, amountToPay) {
    const receiverName = prompt(`Who is ${debtorName} paying back?`);
    if (!receiverName) return;

    const settlementExpense = {
        name: `Settle up: ${debtorName} paid ${receiverName.trim()}`,
        amount: amountToPay.toFixed(2),
        payer: debtorName.trim(),
        receiver: receiverName.trim(),
        isSettlement: true
    };

    expenses.push(settlementExpense);
    localStorage.setItem('roommateExpenses', JSON.stringify(expenses));
    
    updateBalances();
    renderExpenses();
    alert(`${debtorName} paid $${amountToPay.toFixed(2)} to ${receiverName}!`);
}

// DELETE EXPENSE FUNCTION
window.deleteExpense = function(index) {
    expenses.splice(index, 1);
    localStorage.setItem('roommateExpenses', JSON.stringify(expenses));
    updateBalances();
    renderExpenses();
}

// Initial Run on Page Load
updateBalances();
renderExpenses();