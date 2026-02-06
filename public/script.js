const form = document.getElementById('uploadForm');
const fileInput = document.querySelector('.file-input');
const filePreviewName = document.getElementById('filePreviewName');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const resultArea = document.getElementById('resultArea');
const resultImage = document.getElementById('resultImage');
const downloadLink = document.getElementById('downloadLink');
const errorArea = document.getElementById('errorArea');

// Tampilkan nama file saat dipilih
fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
        filePreviewName.textContent = `File terpilih: ${this.files[0].name}`;
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    
    // Reset UI
    submitBtn.disabled = true;
    loading.classList.remove('hidden');
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');
    errorArea.textContent = '';

    try {
        const response = await fetch('/api/upscale', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal memproses gambar');
        }

        // Ambil gambar sebagai Blob
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        // Tampilkan hasil
        resultImage.src = imageUrl;
        downloadLink.href = imageUrl;
        
        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');

    } catch (err) {
        loading.classList.add('hidden');
        errorArea.classList.remove('hidden');
        errorArea.textContent = `Error: ${err.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});
