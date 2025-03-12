Common errors that might arise: 

1. INTEL oneMKL ERROR: The specified module could not be found. mkl_intel_thread.2.dll. and Intel oneMKL FATAL ERROR: Cannot load mkl_intel_thread.2.dll. when running `flask --app flask_app --debug run`. 

**Solution:** find location of mkl_intel_thread.dll with `where mkl_intel_thread.dll` in Windows, copy path and set it with a new name: 
`cd C:\Users\LENOVO\anaconda3\envs\flask_app\Library\bin
copy mkl_intel_thread.dll mkl_intel_thread.2.dll`
