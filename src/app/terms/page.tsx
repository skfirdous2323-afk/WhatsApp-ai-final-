export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">📋 Terms & Conditions</h1>
        <p className="text-gray-500 text-sm mb-6">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By using our services, you agree to these Terms & Conditions. If you do not agree, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Booking & Appointments</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>All bookings are subject to availability</li>
              <li>You must provide accurate information</li>
              <li>You must arrive 15 minutes before scheduled time</li>
              <li>Cancellation must be made 24 hours in advance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Payments</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>All payments are processed securely via Razorpay</li>
              <li>Prices are subject to change without prior notice</li>
              <li>Payment confirmation is required for booking confirmation</li>
              <li>Refunds are processed as per our Refund Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. User Responsibilities</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate and truthful information</li>
              <li>Respect clinic
