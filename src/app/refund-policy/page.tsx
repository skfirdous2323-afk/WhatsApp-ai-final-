export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          💰 Refund & Cancellation Policy
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          Last Updated: {new Date().toLocaleDateString("en-IN")}
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          {/* 1. Cancellation Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Cancellation Policy
            </h2>

            <p>
              Customers may request cancellation of an appointment or
              service according to the following cancellation terms:
            </p>

            <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong>24 or more hours before the appointment:</strong>{" "}
                  Eligible for a full refund.
                </li>

                <li>
                  <strong>12 to 24 hours before the appointment:</strong>{" "}
                  Eligible for a 50% refund.
                </li>

                <li>
                  <strong>Less than 12 hours before the appointment:</strong>{" "}
                  Not eligible for a refund.
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Refund Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Refund Eligibility
            </h2>

            <p>
              Refunds are subject to the applicable cancellation terms and
              the nature of the service purchased. Any refund request will
              be reviewed based on the payment and appointment details.
            </p>

            <p className="mt-3">
              In cases where a service cannot be provided due to reasons
              attributable to us, customers may be eligible for a full
              refund or an alternative appointment, as applicable.
            </p>
          </section>

          {/* 3. Refund Processing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Refund Processing
            </h2>

            <p>
              Approved refunds will be processed through the original
              payment method used by the customer, where possible.
            </p>

            <p className="mt-3">
              The time required for the refunded amount to appear in the
              customer's account may depend on the payment provider or
              bank's processing time.
            </p>
          </section>

          {/* 4. Payment Gateway */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Payment Processing
            </h2>

            <p>
              Payments may be processed securely through third-party
              payment providers such as Razorpay. Payment processing,
              transaction security, and related payment information may
              also be subject to the payment provider's terms and policies.
            </p>
          </section>

          {/* 5. Appointment Changes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Appointment Rescheduling
            </h2>

            <p>
              Customers may contact us to request an appointment
              rescheduling. Rescheduling requests are subject to
              availability and may be handled according to the applicable
              cancellation terms.
            </p>
          </section>

          {/* 6. Non-Refundable Situations */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Non-Refundable Situations
            </h2>

            <p>
              Refunds may not be available where the cancellation is made
              less than 12 hours before the scheduled appointment, or where
              the service has already been provided.
            </p>
          </section>

          {/* 7. Contact Us */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Contact Us
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
            For any questions or refund requests, please contact our
            support team using the contact details provided above.
          </p>
        </div>
      </div>
    </div>
  );
}
