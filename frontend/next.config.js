module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'br.web.img2.acsta.net', // Sem o 'https://'
        port: '', // Mantenha vazio se não houver porta específica
        pathname: '/**', // Ajuste conforme necessário para combinar com os caminhos da URL
      },
    ],
  },
}