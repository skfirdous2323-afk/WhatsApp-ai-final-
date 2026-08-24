export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📋 Terms & Conditions
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          Last Updated: {new Date().toLocaleDateString("en-IN")}
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Acceptance of Terms
            </h2>

            <p>
              By accessing or using our website, applications, WhatsApp
              services, appointment systems, or other services, you agree
              to be bound by these Terms & Conditions.
            </p>

            <p className="mt-3">
              If you do not agree with these terms, please do not use our
              services.
            </p>
          </section>

          {/* 2. Services */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Our Services
            </h2>

            <p>
              Our services may include appointment booking, customer
              communication, WhatsApp automation, notifications,
              customer support, payment-related functionality, and other
              business or healthcare-related administrative services.
            </p>

            <p className="mt-3">
              The availability and features of the services may change
              from time to time.
            </p>
          </section>

          {/* 3. User Responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. User Responsibilities
            </h2>

            <p>Users agree to:</p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Provide accurate and complete information.</li>
              <li>Use the services only for lawful purposes.</li>
              <li>Not misuse, disrupt, or attempt to damage our services.</li>
              <li>Keep account and access credentials secure.</li>
              <li>Provide correct information when booking appointments.</li>
            </ul>
          </section>

          {/* 4. Appointments */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Appointments
            </h2>

            <p>
              Appointment availability depends on the selected service,
              doctor, business, and available time slots. An appointment
              should be considered confirmed only after the applicable
              confirmation process has been completed.
            </p>

            <p className="mt-3">
              Users are responsible for providing accurate appointment
              information and arriving at the scheduled time.
            </p>
          </section>

          {/* 5. Payments */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Payments
            </h2>

            <p>
              Where applicable, payments may be processed through
              authorized third-party payment providers such as Razorpay.
              Payment processing may be subject to the payment provider's
              own terms and policies.
            </p>
          </section>

          {/* 6. Cancellation & Refund */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Cancellation & Refunds
            </h2>

            <p>
              Appointment cancellations and refunds are governed by our
              Refund & Cancellation Policy. Customers should review that
              policy before making a payment or booking an appointment.
            </p>
          </section>

          {/* 7. WhatsApp Communication */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. WhatsApp Communication
            </h2>

            <p>
              If you choose to communicate with us through WhatsApp, you
              authorize us to use the information you provide for
              customer support, appointment management, notifications,
              and other requested services.
            </p>

            <p className="mt-3">
              WhatsApp communications may be subject to WhatsApp and
              Meta's applicable terms and policies.
            </p>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Intellectual Property
            </h2>

            <p>
              Unless otherwise stated, the content, design, software,
              logos, graphics, text, and other materials used in our
              services are owned by or licensed to us and may not be
              copied, modified, distributed, or reproduced without
              appropriate authorization.
            </p>
          </section>

          {/* 9. Third Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Third-Party Services
            </h2>

            <p>
              Our services may integrate with third-party platforms,
              including payment providers, hosting providers,
              communication platforms, analytics services, and other
              technology providers.
            </p>

            <p className="mt-3">
              We are not responsible for interruptions, failures, or
              policy changes caused by third-party services.
            </p>
          </section>

          {/* 10. Service Availability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Service Availability
            </h2>

            <p>
              We make reasonable efforts to keep our services available
              and functional. However, we do not guarantee uninterrupted,
              error-free, or completely secure operation at all times.
            </p>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              11. Limitation of Liability
            </h2>

            <p>
              To the extent permitted by applicable law, we will not be
              liable for indirect, incidental, consequential, or
              unforeseeable losses resulting from the use or inability
              to use our services.
            </p>
          </section>

          {/* 12. Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              12. Privacy
            </h2>

            <p>
              Your use of our services is also subject to our Privacy
              Policy, which explains how we collect, use, store, and
              protect personal information.
            </p>
          </section>

          {/* 13. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              13. Changes to These Terms
            </h2>

            <p>
              We may update or modify these Terms & Conditions from time
              to time. Updated terms will be published on this page with
              a revised "Last Updated" date.
            </p>

            <p className="mt-3">
              Continued use of our services after changes are published
              indicates acceptance of the updated terms.
            </p>
          </section>

          {/* 14. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              14. Contact Us
            </h2>

            <div className="mt-3 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:skfirdous1111@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  skfirdous1111@gmail.com
                </a>
              </p>

              <p className="mt-2">
                <strong>Phone:</strong>{" "}
                <a
                  href="tel:+918250778707"
                  className="text-blue-600 hover:underline"
                >
                  +91 82507 78707
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            By using our services, you acknowledge that you have read,
            understood, and agreed to these Terms & Conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
