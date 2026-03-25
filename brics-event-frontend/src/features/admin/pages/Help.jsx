// import React from 'react'

// const Help = () => {
//   return (
//     <div className='text-base sm:text-lg md:text-xl flex flex-col sm:flex-row justify-center items-center gap-2 px-4 sm:px-6 py-10 text-center sm:text-left'>
//       <span>For any assistance related to the BRICS Accreditation Portal, please contact the Admin BRICS 2026 at</span>
//       <a 
//         href='mailto:support.brics@mea.gov.in' 
//         className='text-[#1e40af] underline font-bold hover:text-[#1e40af]/80 transition-colors cursor-pointer'
//       >
//         support.brics@mea.gov.in
//       </a>
//     </div>
//   )
// }

// export default Help

import React from 'react'

const Help = () => {
  return (
    <div className='px-4 sm:px-6 py-10 max-w-6xl mx-auto'>
      <h1 className='text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-800'>Help & Support</h1>
      
      <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-6'>
        <p className='text-base sm:text-lg mb-6 text-gray-700 text-center'>
          For assistance related to the BRICS Accreditation Portal, please contact the appropriate support team based on your event:
        </p>
        
        <div className='space-y-6'>
          <div className='border-l-4 border-blue-500 pl-6 py-4 bg-blue-50 rounded-r-lg'>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>
              1st BRICS Finance Ministers and Central Bank Governors Meeting (FMCBG)
            </h3>
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-gray-600'>Support Contact:</span>
              <a 
                href='mailto:brics.fin.logistic@gov.in' 
                className='text-[#1e40af] underline font-bold hover:text-[#1e40af]/80 transition-colors cursor-pointer'
              >
                brics.fin.logistic@gov.in
              </a>
            </div>
          </div>
          
          <div className='border-l-4 border-green-500 pl-6 py-4 bg-green-50 rounded-r-lg'>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>
              FIRST BRICS SHERPA/SOUS SHERPA MEETING
            </h3>
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-gray-600'>Support Contact:</span>
              <a 
                href='mailto:support.brics@mea.gov.in' 
                className='text-[#1e40af] underline font-bold hover:text-[#1e40af]/80 transition-colors cursor-pointer'
              >
                support.brics@mea.gov.in
              </a>
            </div>
          </div>
          
          <div className='border-l-4 border-purple-500 pl-6 py-4 bg-purple-50 rounded-r-lg'>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>
              1st CGETI Meeting
            </h3>
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-gray-600'>Support Contact:</span>
              <a 
                href='mailto:cgeti.brics@gov.in' 
                className='text-[#1e40af] underline font-bold hover:text-[#1e40af]/80 transition-colors cursor-pointer'
              >
                cgeti.brics@gov.in
              </a>
            </div>
          </div>
        </div>
        
        <div className='mt-8 p-4 bg-gray-100 rounded-lg'>
          <p className='text-sm text-gray-600 text-center'>
            For general inquiries about the BRICS 2026 events, please use the appropriate contact email above.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Help
