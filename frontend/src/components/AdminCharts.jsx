import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function TrendChart({ data }) {
  return (
    <div className="chart-panel">
      <h3>{'\u8fd1 7 \u5929\u8bbf\u95ee\u8d8b\u52bf'}</h3>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="views" fill="#0f766e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function DeviceChart({ data }) {
  const colors = ['#f97316', '#2563eb', '#16a34a', '#db2777']
  return (
    <div className="chart-panel">
      <h3>{'\u8bbe\u5907\u5206\u5e03'}</h3>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="device_type" innerRadius={48} outerRadius={72}>
              {data.map((item, index) => (
                <Cell key={item.device_type} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
