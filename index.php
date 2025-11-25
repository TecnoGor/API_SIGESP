<?php
// funciones_factura.php debe estar incluido
require_once 'imprimirCG.php';

if ($_POST['id_fact'] ?? false) {
    $id_fact = intval($_POST['id_fact']);
    $resultado = procesarFacturaEnAPI($id_fact);
}
?>

<html>
<head>
    <title>Procesar Factura</title>
    <style>
        body { font-family: Arial; margin: 40px; }
        .form { margin: 20px 0; }
        input, button { padding: 10px; margin: 5px; }
        .success { color: green; background: #e8f5e8; padding: 10px; }
        .error { color: red; background: #ffe8e8; padding: 10px; }
    </style>
</head>
<body>
    <h1>Procesar Factura</h1>
    
    <form method="POST" class="form">
        <input type="number" name="id_fact" placeholder="ID Factura" required>
        <button type="submit">Procesar</button>
    </form>

    <?php if (isset($resultado)): ?>
        <div class="<?php echo $resultado['success'] ? 'success' : 'error'; ?>">
            <?php if ($resultado['success']): ?>
                <strong>✅ Éxito:</strong> <?php echo $resultado['message']; ?>
                <?php if (!empty($resultado['invoice_list_success'])): ?>
                    <br>PDF: <a href="<?php echo $resultado['invoice_list_success'][0]['invoice_pdf']; ?>" target="_blank">
                        Ver documento
                    </a>
                <?php endif; ?>
            <?php else: ?>
                <strong>❌ Error:</strong> <?php echo $resultado['error']; ?>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</body>
</html>