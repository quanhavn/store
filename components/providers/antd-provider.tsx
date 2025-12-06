'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider, App } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { ReactNode } from 'react'

const theme = {
  token: {
    colorPrimary: '#3b82f6',
    borderRadius: 8,
  },
}

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={viVN} theme={theme}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  )
}
