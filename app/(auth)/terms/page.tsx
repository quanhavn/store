import { Card, Typography } from 'antd'
import Link from 'next/link'
import { ArrowLeftOutlined, ShopOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 py-4 mb-4">
          <Link 
            href="/login" 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftOutlined className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <ShopOutlined className="text-white" />
            </div>
            <Text strong>Quản Lý Cửa Hàng</Text>
          </div>
        </div>

        <Card className="mb-6">
          <Title level={2} className="!mb-2">Điều khoản dịch vụ</Title>
          <Text type="secondary" className="block mb-6">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </Text>

          <div className="space-y-6">
            <section>
              <Title level={4}>1. Giới thiệu</Title>
              <Paragraph>
                Chào mừng bạn đến với ứng dụng Quản Lý Cửa Hàng. Bằng việc sử dụng dịch vụ của chúng tôi, 
                bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>2. Định nghĩa</Title>
              <Paragraph>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>&quot;Dịch vụ&quot;</strong>: Ứng dụng Quản Lý Cửa Hàng và tất cả các tính năng liên quan.</li>
                  <li><strong>&quot;Người dùng&quot;</strong>: Cá nhân hoặc tổ chức sử dụng Dịch vụ.</li>
                  <li><strong>&quot;Tài khoản&quot;</strong>: Tài khoản được tạo để truy cập và sử dụng Dịch vụ.</li>
                </ul>
              </Paragraph>
            </section>

            <section>
              <Title level={4}>3. Đăng ký tài khoản</Title>
              <Paragraph>
                Để sử dụng Dịch vụ, bạn cần đăng ký tài khoản với thông tin chính xác và cập nhật. 
                Bạn có trách nhiệm bảo mật thông tin đăng nhập và chịu trách nhiệm về mọi hoạt động 
                diễn ra dưới tài khoản của mình.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>4. Quyền và nghĩa vụ của người dùng</Title>
              <Paragraph>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Sử dụng Dịch vụ đúng mục đích và tuân thủ pháp luật Việt Nam.</li>
                  <li>Không sử dụng Dịch vụ cho các hoạt động bất hợp pháp.</li>
                  <li>Cung cấp thông tin chính xác khi đăng ký và sử dụng Dịch vụ.</li>
                  <li>Tuân thủ các quy định về thuế và hóa đơn điện tử theo quy định.</li>
                </ul>
              </Paragraph>
            </section>

            <section>
              <Title level={4}>5. Bảo mật thông tin</Title>
              <Paragraph>
                Chúng tôi cam kết bảo vệ thông tin cá nhân và dữ liệu kinh doanh của bạn. 
                Thông tin của bạn được mã hóa và lưu trữ an toàn theo tiêu chuẩn bảo mật cao nhất.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>6. Quy định về thuế</Title>
              <Paragraph>
                Dịch vụ hỗ trợ tuân thủ quy định thuế Việt Nam 2026, bao gồm:
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Hỗ trợ tính VAT theo mức thuế suất hiện hành (8% - 10%).</li>
                  <li>Tạo và quản lý hóa đơn điện tử theo quy định.</li>
                  <li>Lưu trữ dữ liệu giao dịch theo yêu cầu pháp luật.</li>
                </ul>
              </Paragraph>
            </section>

            <section>
              <Title level={4}>7. Giới hạn trách nhiệm</Title>
              <Paragraph>
                Chúng tôi không chịu trách nhiệm về các thiệt hại gián tiếp, ngẫu nhiên hoặc 
                hậu quả phát sinh từ việc sử dụng hoặc không thể sử dụng Dịch vụ.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>8. Chấm dứt dịch vụ</Title>
              <Paragraph>
                Chúng tôi có quyền tạm ngừng hoặc chấm dứt tài khoản của bạn nếu phát hiện 
                vi phạm các điều khoản này hoặc các hành vi gây hại đến Dịch vụ.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>9. Thay đổi điều khoản</Title>
              <Paragraph>
                Chúng tôi có quyền cập nhật các điều khoản này bất kỳ lúc nào. Các thay đổi 
                sẽ được thông báo qua ứng dụng hoặc email đăng ký.
              </Paragraph>
            </section>

            <section>
              <Title level={4}>10. Liên hệ</Title>
              <Paragraph>
                Nếu có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên hệ với chúng tôi qua:
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Email: support@quanlycuahang.vn</li>
                  <li>Hotline: 1900 xxxx xx</li>
                </ul>
              </Paragraph>
            </section>
          </div>
        </Card>

        <div className="text-center pb-6">
          <Link href="/login">
            <Text type="secondary" className="hover:text-blue-500 transition-colors">
              ← Quay lại đăng nhập
            </Text>
          </Link>
        </div>
      </div>
    </div>
  )
}
