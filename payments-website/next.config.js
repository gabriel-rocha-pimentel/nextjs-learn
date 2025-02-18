module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co', // Apenas o domínio
        port: '', // Mantenha vazio se não houver uma porta específica
        pathname: '/**', // Aceita todas as imagens do domínio
      },
    ],
  },
};
