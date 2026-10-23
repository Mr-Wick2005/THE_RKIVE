import test from 'node:test';
import assert from 'node:assert/strict';

// Simulation of the Department Admin UI Submission & Payment State Machine
class PublicationUiSubmissionController {
  constructor() {
    this.modalState = {
      confirmModalOpen: false,
      paymentModalOpen: false,
      feedbackMessage: null,
      feedbackType: null,
    };
    this.magazine = null;
    this.paymentObligation = null;
    this.submissionCalls = [];
  }

  setupMagazine({ id, title, status = 'DRAFT', processing_status = 'COMPLETED', isPaid = false, feePaise = 2000 }) {
    this.magazine = { id, title, status, processing_status };
    this.paymentObligation = {
      magazine_id: id,
      status: isPaid ? 'PAID' : 'PENDING',
      amount_paise: feePaise,
    };
  }

  // Corresponds to handleStartSubmit in PublicationTable and onClick in PublicationForm
  async handleClickSubmit() {
    this.modalState.feedbackMessage = null;

    if (this.magazine.processing_status !== 'COMPLETED') {
      this.modalState.feedbackType = 'error';
      this.modalState.feedbackMessage = 'Publication must complete processing before submission.';
      return;
    }

    // Check payment status before opening ANY confirmation dialog
    const isPaid = this.paymentObligation && this.paymentObligation.status === 'PAID';

    if (isPaid) {
      // Already paid: Proceed directly to editorial confirmation dialog
      this.modalState.confirmModalOpen = true;
      this.modalState.paymentModalOpen = false;
    } else {
      // Unpaid: Open payment modal directly; DO NOT open confirm dialog
      this.modalState.paymentModalOpen = true;
      this.modalState.confirmModalOpen = false;
    }
  }

  // Corresponds to onPaymentSuccess callback from PaymentModal
  handlePaymentSuccess() {
    this.paymentObligation.status = 'PAID';
    this.modalState.paymentModalOpen = false;
    // Transition to submission confirmation dialog once verified
    this.modalState.confirmModalOpen = true;
  }

  // Corresponds to handleConfirmSubmit / handleFormSubmit(true)
  async handleConfirmSubmit() {
    this.submissionCalls.push({ timestamp: Date.now(), magId: this.magazine.id });

    // Financial gating rule: Server action strictly verifies payment
    if (!this.paymentObligation || this.paymentObligation.status !== 'PAID') {
      this.modalState.feedbackType = 'error';
      this.modalState.feedbackMessage = 'Payment Required: A verified submission fee (₹20) must be confirmed before submitting for review.';
      this.modalState.confirmModalOpen = false;
      return { success: false, error: this.modalState.feedbackMessage };
    }

    this.magazine.status = 'SUBMITTED';
    this.modalState.confirmModalOpen = false;
    this.modalState.feedbackType = 'success';
    this.modalState.feedbackMessage = `"${this.magazine.title}" has been submitted for college review.`;
    return { success: true };
  }
}

test('UI Submission & Payment Modal Flow', async (t) => {
  await t.test('1. Unpaid eligible magazine opens PaymentModal, NOT ConfirmSubmitDialog, and does NOT call submission action', async () => {
    const ctrl = new PublicationUiSubmissionController();
    ctrl.setupMagazine({ id: 'mag_unpaid_1', title: 'Tech Review 2026', isPaid: false });

    // Click Submit
    await ctrl.handleClickSubmit();

    assert.equal(ctrl.modalState.paymentModalOpen, true, 'Payment modal must be opened');
    assert.equal(ctrl.modalState.confirmModalOpen, false, 'Confirm dialog must NOT be opened');
    assert.equal(ctrl.submissionCalls.length, 0, 'No submission action must be called prior to payment');
    assert.equal(ctrl.magazine.status, 'DRAFT', 'Status must remain DRAFT');
  });

  await t.test('2. Successful verified payment closes PaymentModal and opens ConfirmSubmitDialog', async () => {
    const ctrl = new PublicationUiSubmissionController();
    ctrl.setupMagazine({ id: 'mag_unpaid_2', title: 'Arts Journal 2026', isPaid: false });

    await ctrl.handleClickSubmit();
    assert.equal(ctrl.modalState.paymentModalOpen, true);

    // Payment succeeds and is verified
    ctrl.handlePaymentSuccess();

    assert.equal(ctrl.modalState.paymentModalOpen, false, 'Payment modal must close on success');
    assert.equal(ctrl.modalState.confirmModalOpen, true, 'Confirm submit dialog must open after payment verification');
    assert.equal(ctrl.paymentObligation.status, 'PAID');
  });

  await t.test('3. Confirming submission of verified paid magazine transitions status to SUBMITTED', async () => {
    const ctrl = new PublicationUiSubmissionController();
    ctrl.setupMagazine({ id: 'mag_paid_1', title: 'Science Today 2026', isPaid: true });

    // Click submit
    await ctrl.handleClickSubmit();
    assert.equal(ctrl.modalState.confirmModalOpen, true, 'Already paid magazine opens confirm dialog directly');
    assert.equal(ctrl.modalState.paymentModalOpen, false, 'Payment modal must NOT open for already-paid magazine');

    // Confirm submit
    const res = await ctrl.handleConfirmSubmit();
    assert.equal(res.success, true);
    assert.equal(ctrl.magazine.status, 'SUBMITTED', 'Status must transition to SUBMITTED');
    assert.equal(ctrl.submissionCalls.length, 1);
  });

  await t.test('4. If payment fails or remains pending, submission action is blocked', async () => {
    const ctrl = new PublicationUiSubmissionController();
    ctrl.setupMagazine({ id: 'mag_pending', title: 'Pending UPI Issue', isPaid: false });

    // Directly attempting to confirm submit while unpaid
    const res = await ctrl.handleConfirmSubmit();
    assert.equal(res.success, false);
    assert.match(res.error, /Payment Required/);
    assert.equal(ctrl.magazine.status, 'DRAFT', 'Status must remain DRAFT');
  });

  await t.test('5. Corrected rejected magazine retains paid entitlement and does not require another fee', async () => {
    const ctrl = new PublicationUiSubmissionController();
    // Magazine was previously paid, submitted, and rejected with revision notes
    ctrl.setupMagazine({ id: 'mag_rejected_resubmit', title: 'Resubmitted Issue', isPaid: true, status: 'REJECTED' });

    // Department Admin clicks submit on corrected issue
    await ctrl.handleClickSubmit();

    assert.equal(ctrl.modalState.confirmModalOpen, true, 'Paid corrected issue proceeds to confirm dialog');
    assert.equal(ctrl.modalState.paymentModalOpen, false, 'Must NOT prompt for second payment');

    // Confirm resubmission
    const res = await ctrl.handleConfirmSubmit();
    assert.equal(res.success, true);
    assert.equal(ctrl.magazine.status, 'SUBMITTED');
  });
});
