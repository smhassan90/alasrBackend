const form = document.getElementById('deleteAccountForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmCheckbox = document.getElementById('confirmDelete');
const loadingDiv = document.getElementById('loading');
const errorDialog = document.getElementById('errorDialog');
const successDialog = document.getElementById('successDialog');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const errorDialogCloseBtn = document.getElementById('errorDialogCloseBtn');
const successDialogCloseBtn = document.getElementById('successDialogCloseBtn');

function showErrorDialog(message) {
    // Ensure success dialog is closed first
    if (successDialog) {
        successDialog.classList.remove('active');
    }
    // Show error dialog
    if (errorMessage && errorDialog) {
        errorMessage.textContent = message;
        errorDialog.classList.add('active');
    }
}

function closeErrorDialog() {
    if (errorDialog) {
        errorDialog.classList.remove('active');
    }
}

function showSuccessDialog(message) {
    // Ensure error dialog is closed first
    if (errorDialog) {
        errorDialog.classList.remove('active');
    }
    // Small delay to ensure error dialog is fully closed
    setTimeout(function() {
        if (successMessage && successDialog) {
            successMessage.textContent = message;
            successDialog.classList.add('active');
        }
    }, 50);
}

function closeSuccessDialog() {
    successDialog.classList.remove('active');
    window.location.href = '/';
}

// Add event listeners to close buttons
if (errorDialogCloseBtn) {
    errorDialogCloseBtn.addEventListener('click', closeErrorDialog);
}

if (successDialogCloseBtn) {
    successDialogCloseBtn.addEventListener('click', closeSuccessDialog);
}

// Close dialog when clicking outside
if (errorDialog) {
    errorDialog.addEventListener('click', function(e) {
        if (e.target === errorDialog) {
            closeErrorDialog();
        }
    });
}

if (successDialog) {
    successDialog.addEventListener('click', function(e) {
        if (e.target === successDialog) {
            closeSuccessDialog();
        }
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const isChecked = confirmCheckbox.checked;
    
    // Validation - show error dialog if any field is missing or checkbox is not checked
    if (!email || !password || !isChecked) {
        showErrorDialog('Please fill in all fields and check the confirmation box');
        return;
    }
    
    // All validations passed - call delete API to deactivate the user
    loadingDiv.classList.add('active');
    form.style.display = 'none';
    
    try {
        // Call delete account API - this will deactivate the user (set is_active = false)
        const protocol = window.location.protocol;
        const host = window.location.host;
        const apiUrl = protocol + '//' + host + '/api/v1/auth/delete-account';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        loadingDiv.classList.remove('active');
        
        if (response.ok && data.success) {
            // Ensure error dialog is closed
            errorDialog.classList.remove('active');
            // Show success dialog
            showSuccessDialog('Your account has been successfully deleted. You will be redirected to the home page.');
        } else {
            form.style.display = 'block';
            // Ensure success dialog is closed
            successDialog.classList.remove('active');
            const errorMsg = data.message || 'Failed to delete account. Please check your email and password.';
            showErrorDialog(errorMsg);
        }
    } catch (error) {
        loadingDiv.classList.remove('active');
        form.style.display = 'block';
        showErrorDialog('An error occurred: ' + error.message + '. Please try again later.');
    }
});

