// src/utils/settlement.js

/**
 * Calculates the net balances for each member in a bill.
 * @param {Array} members - Array of bill members
 * @param {Array} expenses - Array of expenses, each containing an `expense_splits` array
 * @returns {Array} Array of member balance objects
 */
export function calculateBalances(members, expenses) {
  const balances = {};

  // 1. Initialize balances map
  members.forEach((m) => {
    const key = m.user_id || m.guest_id;
    if (key) {
      balances[key] = {
        key,
        member: m,
        paid: 0,
        owed: 0,
        net: 0,
      };
    }
  });

  // 2. Sum up what each person paid and what each person owes
  expenses.forEach((expense) => {
    const payerKey = expense.paid_by;
    // Add to paid
    if (balances[payerKey]) {
      balances[payerKey].paid += Number(expense.amount);
    }

    // Add to owed from splits
    const splits = expense.expense_splits || [];
    splits.forEach((split) => {
      const debtorKey = split.user_id;
      if (balances[debtorKey]) {
        balances[debtorKey].owed += Number(split.amount);
      }
    });
  });

  // 3. Compute net
  Object.values(balances).forEach((b) => {
    b.net = b.paid - b.owed;
  });

  return Object.values(balances);
}

/**
 * Generates minimum transactions needed to settle all debts (Greedy algorithm).
 * @param {Array} balancesArray - Array returned by calculateBalances
 * @returns {Array} Array of settlement transactions: { from: member, to: member, amount: number }
 */
export function calculateSettlements(balancesArray) {
  // Debtors: net < 0. Convert net to positive amount they owe.
  const debtors = balancesArray
    .filter((b) => b.net <= -0.01)
    .map((b) => ({ ...b, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  // Creditors: net > 0.
  const creditors = balancesArray
    .filter((b) => b.net >= 0.01)
    .map((b) => ({ ...b, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];

  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.005) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: amount,
      });
    }

    // Update remaining amounts
    debtor.amount -= amount;
    creditor.amount -= amount;

    // Move pointers if settled
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return settlements;
}
