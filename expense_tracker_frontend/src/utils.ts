export const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2
  }).format(value);

export const dateLabel = (value?: string) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(new Date(value));
};

export const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const categories = [
  "Food", "Travel", "Shopping", "Education", "Medical",
  "Bills", "Rent", "Business", "Personal", "Other"
];
