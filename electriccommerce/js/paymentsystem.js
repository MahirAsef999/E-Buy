// Payment System JavaScript

let editingPaymentId = null;
const API_URL = "http://127.0.0.1:8000/api";

// Get JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem('token');
}

// Check if user is logged in
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        alert('Please log in to manage payment methods');
        window.location.href = 'auth.html';
        return false;
    }
    return true;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadPaymentMethods();
    setupEventListeners();
    updateCartBadge();
});

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('payment-form');
    const cardNumberInput = document.getElementById('card-number');
    const expiryDateInput = document.getElementById('expiry-date');
    const cvvInput = document.getElementById('cvv');
    const cancelBtn = document.getElementById('cancel-btn');

    // Form submission
    form.addEventListener('submit', handleFormSubmit);

    // Card number formatting (add spaces every 4 digits)
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formattedValue;
    });

    // Expiry date formatting (MM/YY)
    expiryDateInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });

    // CVV - only numbers
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Cancel button
    cancelBtn.addEventListener('click', resetForm);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        cardType: document.getElementById('card-type').value,
        cardholderName: document.getElementById('cardholder-name').value,
        cardNumber: document.getElementById('card-number').value.replace(/\s/g, ''),
        expiryDate: document.getElementById('expiry-date').value,
        cvv: document.getElementById('cvv').value,
        billingZip: document.getElementById('billing-zip').value,
        isDefault: document.getElementById('is-default').checked
    };

    // Validate form data
    if (!validatePaymentForm(formData)) {
        return;
    }

    const token = getAuthToken();
    
    try {
        let response;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        if (editingPaymentId) {
            // Update existing payment method
            response = await fetch(`${API_URL}/payment-methods/${editingPaymentId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(formData)
            });
        } else {
            // Add new payment method
            response = await fetch(`${API_URL}/payment-methods`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            });
        }

        if (response.ok) {
            alert(editingPaymentId ? 'Payment method updated successfully!' : 'Payment method added successfully!');
            resetForm();
            await loadPaymentMethods();
        } else {
            const errorText = await response.text();
            alert('Error: ' + errorText);
        }
    } catch (error) {
        console.error('Error saving payment method:', error);
        alert('An error occurred. Please try again.');
    }
}

// Validate payment form
function validatePaymentForm(data) {
    // Validate card number (should be 13-19 digits)
    if (data.cardNumber.length < 13 || data.cardNumber.length > 19) {
        alert('Please enter a valid card number (13-19 digits)');
        return false;
    }

    // Validate only numbers in card
    if (!/^\d+$/.test(data.cardNumber)) {
        alert('Card number should only contain digits');
        return false;
    }

    // Validate expiry date format (MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(data.expiryDate)) {
        alert('Please enter a valid expiry date (MM/YY)');
        return false;
    }

    // Check if expiry date is not in the past
    const [month, year] = data.expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    if (expiry < now) {
        alert('Card has expired. Please enter a valid expiry date.');
        return false;
    }

    // Validate CVV (3-4 digits)
    if (data.cvv.length < 3 || data.cvv.length > 4) {
        alert('Please enter a valid CVV (3-4 digits)');
        return false;
    }

    // Validate ZIP code
    if (data.billingZip.length < 5) {
        alert('Please enter a valid ZIP code');
        return false;
    }

    return true;
}

// Load payment methods from backend
async function loadPaymentMethods() {
    const token = getAuthToken();
    
    try {
        const response = await fetch(`${API_URL}/payment-methods`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const paymentMethods = await response.json();
            displayPaymentMethods(paymentMethods);
        } else if (response.status === 401) {
            alert('Session expired. Please log in again.');
            window.location.href = 'auth.html';
        } else {
            console.error('Failed to load payment methods');
            document.getElementById('payment-methods-list').innerHTML = 
                '<p class="no-payments">Failed to load payment methods.</p>';
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
        document.getElementById('payment-methods-list').innerHTML = 
            '<p class="no-payments">Error loading payment methods.</p>';
    }
}

// Display payment methods
function displayPaymentMethods(methods) {
    const container = document.getElementById('payment-methods-list');
    
    if (!methods || methods.length === 0) {
        container.innerHTML = '<p class="no-payments">No payment methods saved yet.</p>';
        return;
    }

    container.innerHTML = methods.map(method => `
        <div class="payment-card ${method.isDefault ? 'default' : ''}">
            <div class="payment-info">
                <div class="card-type-display">${method.cardType}</div>
                <div class="card-number-display">
                    •••• •••• •••• ${method.lastFourDigits}
                    ${method.isDefault ? '<span class="default-badge">DEFAULT</span>' : ''}
                </div>
                <div class="card-details">
                    ${method.cardholderName} | Expires: ${method.expiryDate}
                </div>
            </div>
            <div class="payment-actions">
                <button class="btn-edit" onclick="editPaymentMethod(${method.id})">Edit</button>
                <button class="btn-delete" onclick="deletePaymentMethod(${method.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Edit payment method
async function editPaymentMethod(id) {
    const token = getAuthToken();
    
    try {
        const response = await fetch(`${API_URL}/payment-methods/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const method = await response.json();
            
            // Populate form with existing data
            document.getElementById('payment-id').value = id;
            document.getElementById('card-type').value = method.cardType;
            document.getElementById('cardholder-name').value = method.cardholderName;
            document.getElementById('card-number').value = method.cardNumber;
            document.getElementById('expiry-date').value = method.expiryDate;
            document.getElementById('cvv').value = ''; // Don't populate CVV for security
            document.getElementById('billing-zip').value = method.billingZip;
            document.getElementById('is-default').checked = method.isDefault;
            
            // Update form title and show cancel button
            document.getElementById('form-title').textContent = 'Edit Payment Method';
            document.getElementById('submit-btn').textContent = 'Update Payment Method';
            document.getElementById('cancel-btn').style.display = 'block';
            
            // Set editing flag
            editingPaymentId = id;
            
            // Scroll to form
            document.querySelector('.payment-form-container').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Failed to load payment method details');
        }
    } catch (error) {
        console.error('Error loading payment method:', error);
        alert('Failed to load payment method details');
    }
}

// Delete payment method
async function deletePaymentMethod(id) {
    if (!confirm('Are you sure you want to delete this payment method?')) {
        return;
    }

    const token = getAuthToken();
    
    try {
        const response = await fetch(`${API_URL}/payment-methods/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Payment method deleted successfully!');
            await loadPaymentMethods();
        } else {
            alert('Failed to delete payment method');
        }
    } catch (error) {
        console.error('Error deleting payment method:', error);
        alert('An error occurred. Please try again.');
    }
}

// Reset form
function resetForm() {
    document.getElementById('payment-form').reset();
    document.getElementById('payment-id').value = '';
    document.getElementById('form-title').textContent = 'Add New Payment Method';
    document.getElementById('submit-btn').textContent = 'Save Payment Method';
    document.getElementById('cancel-btn').style.display = 'none';
    editingPaymentId = null;
}

// Update cart badge
async function updateCartBadge() {
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'X-Demo-Token': 'student1'
            }
        });
        
        if (response.ok) {
            const cart = await response.json();
            const totalItems = cart.items.reduce((sum, item) => sum + item.qty, 0);
            const badge = document.getElementById('cartBadge');
            badge.textContent = totalItems;
            if (totalItems > 0) {
                badge.classList.add('show');
            }
        }
    } catch (error) {
        console.error('Error updating cart badge:', error);
    }
}