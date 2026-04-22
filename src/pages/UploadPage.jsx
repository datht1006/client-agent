import {
  Upload,
  Button,
  Table,
  Card,
  message,
  Spin,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== UPLOAD =====
  const handleUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result?.success) {
        message.error(result?.error || "Parse lỗi");
        return;
      }

      setData(result.data || []);
      message.success("Upload OK");
    } catch (err) {
      console.error(err);
      message.error("Lỗi kết nối BE");
    } finally {
      setLoading(false);
    }
  };

  const props = {
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
    showUploadList: false,
  };

  // ===== BUILD COLUMNS AUTO =====
  const buildColumns = () => {
    if (!data.length) return [];

    const keys = Object.keys(data[0]);

    const baseColumns = keys.map((key) => ({
      title: key,
      dataIndex: key,
      width: 180,
      render: (text) => text || "--",
    }));

    // ===== ADD COLUMN SO SÁNH =====
    baseColumns.push({
      title: "So sánh",
      width: 300,
      fixed: "right",
      render: (_, record) => (
        <div className="text-xs">
          <div className="text-red-500">
            ❌ {record?.ten_vat_tu_chuan_khong_gioi_han_ky_tu || "--"}
          </div>
          <div className="text-green-600">
            ✅ {record?.material_description || "--"}
          </div>
        </div>
      ),
    });

    return baseColumns;
  };

  return (
    <div className="p-6 min-h-screen bg-[#0b2c4d]">
      <h2 className="text-white text-2xl mb-4">
        📂 Upload Excel vật tư
      </h2>

      <Card className="mb-4">
        <Upload {...props}>
          <Button icon={<UploadOutlined />} loading={loading}>
            Upload Excel
          </Button>
        </Upload>
      </Card>

      <Card title="📊 Dữ liệu Excel">
        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={buildColumns()}
            rowKey={(r, i) => i}
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
            bordered
          />
        </Spin>
      </Card>
    </div>
  );
}