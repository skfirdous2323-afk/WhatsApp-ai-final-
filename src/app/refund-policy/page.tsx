export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">📋 Terms & Conditions</h1>
        <p className="text-gray-500 text-sm mb-6">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By using our services, you agree to these Terms & Conditions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Contact Us</h2>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><strong>Email:</strong> support@yourclinic.com</p>
              <p><strong>Phone:</strong> +91 XXXXXXXXXX</p>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>By using our services, you agree to these Terms & Conditions.</p>
        </div>
      </div>
    </div>
  );
}
